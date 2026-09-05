// src/lib/templates-actions.ts
// ─── منطق إنشاء/حذف القوالب — قابل للاستدعاء المباشر من الراوت أو من MCP ────
//
// اتنقل هنا من src/app/api/templates/route.ts عشان MCP يقدر ينادي عليه
// كـ function عادي (import) بدل ما يعمل HTTP request لنفسه، وده بيقفل ثغرة
// كانت موجودة: `resolveOwner` كان بيثق في هيدرز (`x-mcp-internal` /
// `x-mcp-user-id`) من غير أي secret أو توقيع — أي حد برة النظام كان يقدر
// يزوّد نفس الهيدرز ويعمل/يمسح قوالب باسم أي يوزر.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";
import { GRAPH_API_VERSION } from "@/lib/meta-graph";

// Helper function to upload mock/placeholder media files to Meta and get a handle
async function getMetaMediaHandle(accessToken: string, mediaType: string): Promise<string> {
  // 1. Get App ID
  const appRes: Response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/app?access_token=${accessToken}`);
  if (!appRes.ok) throw new Error("Failed to fetch App ID from Meta");
  const appData: any = await appRes.json();
  const appId = appData.id;
  if (!appId) throw new Error("Meta App ID not found in token metadata");

  // 2. Prepare mock media file
  let fileBuffer: Buffer;
  let fileType: string;
  if (mediaType === "image") {
    // 1x1 transparent PNG
    fileBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
    fileType = "image/png";
  } else if (mediaType === "video") {
    // Tiny valid MP4 (1 second silent)
    fileBuffer = Buffer.from(
      "00000018667479706d7034320000000069736f6d6d7034320000000866726565000002cc6d646174",
      "hex"
    );
    fileType = "video/mp4";
  } else {
    // Tiny text file as PDF
    fileBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF");
    fileType = "application/pdf";
  }

  // 3. Initiate upload session
  const initRes: Response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${appId}/uploads?file_length=${fileBuffer.length}&file_type=${fileType}&access_token=${accessToken}`,
    { method: "POST" }
  );
  if (!initRes.ok) {
    const err: any = await initRes.json();
    throw new Error(`Failed to initiate Meta upload session: ${err.error?.message || initRes.statusText}`);
  }
  const initData: any = await initRes.json();
  const uploadSessionId = initData.id;

  // 4. Upload file
  const uploadRes: Response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${uploadSessionId}`, {
    method: "POST",
    headers: {
      "Authorization": `OAuth ${accessToken}`,
      "file_offset": "0",
      "Content-Type": "application/octet-stream"
    },
    body: new Uint8Array(fileBuffer)
  });

  if (!uploadRes.ok) {
    const err: any = await uploadRes.json();
    throw new Error(`Failed to upload media sample to Meta: ${err.error?.message || uploadRes.statusText}`);
  }
  const uploadData: any = await uploadRes.json();
  return uploadData.h; // The handle string
}

export async function createTemplateForUser(ownerId: string, input: {
  name: string; category: string; language: string;
  headerType?: string; headerText?: string; body: string; footer?: string;
  buttons?: any[]; exampleVars?: string[]; draft?: boolean;
}) {
  const { name, category, language, headerType, headerText, body, footer, buttons, exampleVars, draft } = input;

  if (!name || !body || !category) {
    return NextResponse.json({ error: "الاسم والمحتوى والتصنيف حقول مطلوبة" }, { status: 400 });
  }

  // Get WhatsApp configuration for Meta API calls
  const account = await prisma.whatsAppAccount.findUnique({ where: { userId: ownerId } });
  if (!draft && (!account || !account.accessToken || !account.wabaId)) {
    return NextResponse.json({ error: "يرجى ربط حساب واتساب أولاً لتتمكن من الإرسال لميتا" }, { status: 400 });
  }

  let metaId = `local_${Date.now()}`;
  let finalStatus = "PENDING";
  let metaComponents: any[] = [];

  if (!draft && account) {
    const decryptedToken = decryptToken(account.accessToken).trim();

    // 1. Build HEADER component
    if (headerType && headerType !== "none") {
      if (headerType === "text") {
        metaComponents.push({
          type: "HEADER",
          format: "TEXT",
          text: headerText || "",
        });
      } else {
        // Media Header (image, video, document)
        try {
          const handle = await getMetaMediaHandle(decryptedToken, headerType);
          metaComponents.push({
            type: "HEADER",
            format: headerType.toUpperCase(),
            example: {
              header_handle: [handle]
            }
          });
        } catch (uploadErr: any) {
          console.error("Media upload failed:", uploadErr);
          return NextResponse.json({ error: `فشل في إنشاء ملف تجريبي للـ Header: ${uploadErr.message}` }, { status: 400 });
        }
      }
    }

    // 2. Build BODY component
    const varCount = (body.match(/\{\{(\d+)\}\}/g) ?? []).length;
    let bodyExample: any = undefined;
    if (varCount > 0) {
      const vars = [];
      for (let i = 0; i < varCount; i++) {
        vars.push(exampleVars && exampleVars[i] ? exampleVars[i] : `test_${i + 1}`);
      }
      bodyExample = {
        body_text: [vars]
      };
    }

    metaComponents.push({
      type: "BODY",
      text: body,
      ...(bodyExample ? { example: bodyExample } : {})
    });

    // 3. Build FOOTER component
    if (footer && footer.trim()) {
      metaComponents.push({
        type: "FOOTER",
        text: footer.trim(),
      });
    }

    // 4. Build BUTTONS component
    if (buttons && buttons.length > 0) {
      const metaButtons = buttons.map((btn: any) => {
        if (btn.type === "quick_reply") {
          return {
            type: "QUICK_REPLY",
            text: btn.text,
          };
        } else if (btn.type === "url") {
          let urlVal = btn.value || "";
          if (!urlVal.startsWith("http://") && !urlVal.startsWith("https://")) {
            urlVal = "https://" + urlVal;
          }
          const hasVar = urlVal.includes("{{");
          return {
            type: "URL",
            text: btn.text,
            url: urlVal,
            ...(hasVar ? { example: ["https://aiwni.com/example"] } : {})
          };
        } else if (btn.type === "phone") {
          return {
            type: "PHONE_NUMBER",
            text: btn.text,
            phone_number: btn.value,
          };
        }
      }).filter(Boolean);

      if (metaButtons.length > 0) {
        metaComponents.push({
          type: "BUTTONS",
          buttons: metaButtons
        });
      }
    }

    // Send template to Meta Graph API
    const metaUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${account.wabaId}/message_templates`;
    const response = await fetch(metaUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${decryptedToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: name.toLowerCase().replace(/[^a-z0-9_]/g, ""),
        category,
        language,
        components: metaComponents
      })
    });

    const resData = await response.json();
    if (resData.error) {
      console.error("Meta create template error response:", resData);
      const userMsg = resData.error.error_user_msg;
      const userTitle = resData.error.error_user_title;
      const errorDetails = resData.error.error_data?.details;
      const technicalMsg = resData.error.message;

      const errMsg = userMsg
        ? `${userTitle ? userTitle + ": " : ""}${userMsg}`
        : (errorDetails || technicalMsg || "فشل إرسال القالب إلى ميتا");

      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    metaId = resData.id;
  } else if (draft) {
    finalStatus = "PENDING"; // Draft saved as pending in local state
  }

  // Save to Database
  const newTemp = await prisma.template.create({
    data: {
      metaId,
      name: name.toLowerCase().replace(/[^a-z0-9_]/g, ""),
      content: body,
      userId: ownerId,
      status: finalStatus,
      category,
      language,
      headerType: headerType || "none",
      headerText: headerType === "text" ? headerText : null,
      footer: footer || null,
      buttons: (buttons || null) as any,
      components: (metaComponents.length > 0 ? metaComponents : null) as any
    }
  });

  return NextResponse.json(newTemp);
}

export async function deleteTemplateForUser(ownerId: string, id: string) {
  const template = await prisma.template.findFirst({
    where: { id, userId: ownerId }
  });

  if (!template) {
    return NextResponse.json({ error: "القالب غير موجود" }, { status: 404 });
  }

  // Delete from Meta Graph API if it's not a draft/local template
  try {
    if (!template.metaId.startsWith("local_")) {
      const account = await prisma.whatsAppAccount.findUnique({
        where: { userId: ownerId }
      });
      if (account && account.accessToken && account.wabaId) {
        const decryptedToken = decryptToken(account.accessToken).trim();
        const deleteUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${account.wabaId}/message_templates?name=${template.name}`;
        const res = await fetch(deleteUrl, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${decryptedToken}`
          }
        });
        const resData = await res.json();
        console.log("Meta template delete response:", resData);
      }
    }
  } catch (metaErr) {
    console.error("Failed to delete template from Meta:", metaErr);
  }

  await prisma.template.deleteMany({ where: { id, userId: ownerId } });
  return NextResponse.json({ success: true });
}
