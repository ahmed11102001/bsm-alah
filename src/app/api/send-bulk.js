export default async function handler(req, res) {
  // ✅ التحقق من طريقة الطلب
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { numbers, templateName = "welcome_message", campaignName, scheduled } = req.body;

  // ✅ التحقق من صحة البيانات
  if (!numbers || !Array.isArray(numbers)) {
    return res.status(400).json({ error: "يرجى إرسال مصفوفة أرقام صحيحة" });
  }

  if (numbers.length === 0) {
    return res.status(400).json({ error: "لا توجد أرقام للإرسال" });
  }

  // ✅ 2. دالة تنظيف الرقم
  const cleanNumber = (number) => {
    let cleaned = number.toString().replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) cleaned = '20' + cleaned.slice(1);
    if (!cleaned.startsWith('20') && cleaned.length === 10) cleaned = '20' + cleaned;
    return cleaned;
  };

  // ✅ دالة إعادة المحاولة (Retry Logic)
  const sendWithRetry = async (number, retries = 3) => {
    let lastError = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch("https://graph.facebook.com/v19.0/979565035250717/messages", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.WA_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: number,
            type: "template",
            template: {
              name: templateName, // ✅ 3. exact match مطلوب
              language: { code: "ar_EG" } // ✅ 4. changed from ar_EG to ar
            }
          })
        });

        const data = await response.json();
        
        // ✅ 6. Logging محترم للإنتاج
        console.log(`📨 [${i + 1}/${retries}] Sent to ${number}:`, {
          status: response.status,
          success: !!data.messages?.[0]?.id,
          messageId: data.messages?.[0]?.id,
          error: data.error?.message
        });

        // ✅ 1. التحقق الصحيح من نجاح الرسالة
        const success = !!data.messages?.[0]?.id && !data.error;
        
        if (success) {
          return {
            success: true,
            status: response.status,
            messageId: data.messages[0].id,
            response: data
          };
        } else {
          lastError = data.error?.message || "Unknown error";
          // لو الفشل مش مؤقت (زي رقم غلط)، بلاش retry
          if (data.error?.code === 1006) { // رقم غير صالح
            return {
              success: false,
              status: response.status,
              error: data.error?.message,
              permanent: true
            };
          }
        }
      } catch (error) {
        lastError = error.message;
        console.error(`❌ Network error for ${number} (attempt ${i + 1}):`, error.message);
      }
      
      // تأخير متزايد بين المحاولات
      if (i < retries - 1) {
        const delay = 2000 * (i + 1); // 2s, 4s, 6s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return {
      success: false,
      error: lastError,
      permanent: false
    };
  };

  try {
    const results = [];
    
    // ✅ 5. Dynamic delay based on list size
    const baseDelay = numbers.length > 100 ? 3000 : 1500;
    
    for (let i = 0; i < numbers.length; i++) {
      const originalNumber = numbers[i];
      const cleaned = cleanNumber(originalNumber);
      
      console.log(`📤 [${i + 1}/${numbers.length}] Processing: ${originalNumber} -> ${cleaned}`);
      
      const result = await sendWithRetry(cleaned);
      
      results.push({
        originalNumber,
        cleanedNumber: cleaned,
        success: result.success,
        messageId: result.messageId || null,
        status: result.status || null,
        error: result.error || null,
        permanent: result.permanent || false,
        timestamp: new Date().toISOString()
      });
      
      // تأخير بين الرسايل (ما عدا آخر واحد)
      if (i < numbers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, baseDelay));
      }
    }
    
    // ✅ إحصائيات حقيقية
    const successCount = results.filter(r => r.success).length;
    const failedCount = numbers.length - successCount;
    const permanentFailures = results.filter(r => r.permanent).length;
    
    // ✅ حفظ الحملة في قاعدة بيانات (اختياري)
    // await saveCampaignToDatabase({ campaignName, numbers, results, scheduled });
    
    console.log(`🎉 Campaign "${campaignName}" completed:`, {
      total: numbers.length,
      success: successCount,
      failed: failedCount,
      permanentFailures
    });
    
    return res.status(200).json({
      success: successCount > 0,
      campaignName: campaignName || null,
      scheduled: scheduled || null,
      processedCount: numbers.length,
      successCount,
      failedCount,
      permanentFailures,
      results: results.slice(0, 50), // أول 50 نتيجة بس عشان الـ response ما يبقاش كبير
      fullResultsAvailable: results.length > 50,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("💥 API Critical Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}