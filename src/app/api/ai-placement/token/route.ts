import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

const AI_JWT_SECRET =
  process.env.AI_PLACEMENT_JWT_SECRET ||
  "your_super_secret_jwt_key_change_this_in_production_min_32_chars"

// Known valid active student in aiplacementos backend
const DEFAULT_STUDENT_ID = "6aafc4c436cc97a96a311d3a"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const searchParams = request.nextUrl.searchParams
    const studentEmail = searchParams.get("email") || ""
    const studentName = searchParams.get("name") || "Student"

    // Sign a fresh 7-day token for AI PlacementOS backend
    const token = jwt.sign(
      {
        userId: DEFAULT_STUDENT_ID,
        role: "STUDENT",
        email: studentEmail,
        name: studentName,
      },
      AI_JWT_SECRET,
      { expiresIn: "7d" }
    )

    return NextResponse.json({
      success: true,
      token,
      userId: DEFAULT_STUDENT_ID,
      role: "STUDENT",
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to issue AI placement token" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
