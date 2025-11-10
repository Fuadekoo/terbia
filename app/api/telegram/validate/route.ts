import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { initData } = await request.json();

    if (!initData) {
      return NextResponse.json(
        { error: "Init data is required" },
        { status: 400 }
      );
    }

    // Parse the init data to extract user information
    const urlParams = new URLSearchParams(initData);
    const userParam = urlParams.get("user");

    if (!userParam) {
      return NextResponse.json(
        { error: "User data not found in init data" },
        { status: 400 }
      );
    }

    const user = JSON.parse(userParam);

    // Return the validated user data
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        language_code: user.language_code,
        is_premium: user.is_premium,
        allows_write_to_pm: user.allows_write_to_pm,
      },
    });
  } catch (error) {
    console.error("Error validating Telegram init data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
