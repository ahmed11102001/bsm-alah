import { NextResponse } from "next/server";

/**
 * Standardized API Response
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

/**
 * Success Response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status = 200
): NextResponse<APIResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message: message || "Success",
      status,
    },
    { status }
  );
}

/**
 * Error Response
 */
export function errorResponse(
  error: string | Error,
  status = 500
): NextResponse<APIResponse> {
  const errorMessage = error instanceof Error ? error.message : error;
  
  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
      status,
    },
    { status }
  );
}

/**
 * Validation Error Response (400)
 */
export function validationError(message: string): NextResponse<APIResponse> {
  return errorResponse(message, 400);
}

/**
 * Not Found Response (404)
 */
export function notFoundResponse(): NextResponse<APIResponse> {
  return errorResponse("Resource not found", 404);
}

/**
 * Unauthorized Response (401)
 */
export function unauthorizedResponse(): NextResponse<APIResponse> {
  return errorResponse("Unauthorized", 401);
}

/**
 * Server Error Response (500)
 */
export function serverErrorResponse(error: Error): NextResponse<APIResponse> {
  console.error("[API Error]", error);
  return errorResponse("Internal server error", 500);
}

/**
 * Safe API Route Wrapper
 * Handles errors automatically
 */
export async function safeAPIRoute<T>(
  handler: (req: Request) => Promise<NextResponse<APIResponse<T>>>
) {
  return async (req: Request): Promise<NextResponse> => {
    try {
      return await handler(req);
    } catch (error) {
      console.error("[API Handler Error]", error);
      return serverErrorResponse(error as Error);
    }
  };
}

/**
 * Validate Request Body
 */
export async function validateBody<T>(
  req: Request,
  schema: (data: any) => { valid: boolean; errors?: string[] }
): Promise<{ data: T | null; error: string | null }> {
  try {
    const body = await req.json();
    const validation = schema(body);

    if (!validation.valid) {
      return {
        data: null,
        error: validation.errors?.join(", ") || "Invalid request body",
      };
    }

    return { data: body as T, error: null };
  } catch (error) {
    return {
      data: null,
      error: "Invalid JSON body",
    };
  }
}

/**
 * Check Required Fields
 */
export function checkRequired(
  data: any,
  required: string[]
): { valid: boolean; missing: string[] } {
  const missing = required.filter((field) => !data[field]);
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Sanitize Error Messages
 * Don't expose internal errors to client
 */
export function sanitizeError(error: Error): string {
  if (error.message.includes("UNIQUE constraint failed")) {
    return "هذا البريد مسجل بالفعل";
  }
  if (error.message.includes("Foreign key constraint failed")) {
    return "خطأ في البيانات المرجعية";
  }
  if (error.message.includes("database")) {
    return "خطأ في قاعدة البيانات";
  }
  return "حدث خطأ أثناء معالجة الطلب";
}
