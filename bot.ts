import { Bot } from "grammy";
import prisma from "./lib/db";
import dotenv from "dotenv";
import { allPackages } from "./actions/admin/adminBot";
import {
  getStudentsByPackage,
  getStudentsByPackageAndTeacher,
} from "./actions/admin/analysis";
import { getStudentAnalyticsperPackage } from "./actions/admin/analysis";
import { filterStudentsByPackageList } from "./actions/admin/analysis";
import { filterStudentsByPackageandStatus } from "./actions/admin/analysis";
import { updatePathProgressData } from "./actions/student/progress";
import { InlineKeyboard } from "grammy";
import { getAvailablePacakges } from "./actions/student/package";
import { hasMatchingSubject } from "./lib/subject-matching";
import { retrieveRawInitData } from "@telegram-apps/sdk";

dotenv.config();
const BASE_URL = process.env.FORWARD_URL || process.env.AUTH_URL;
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || "");
export { bot };

export default async function sendMessage(chat_id: number, message: string) {
  try {
    await bot.api.sendMessage(chat_id, message);
  } catch (err) {
    console.error("Failed to send initial message:", err);
  }
}

export async function startBot() {
  const admins = await prisma.admin.findMany();

  bot.command("start", async (ctx) => {
    const chatId = ctx.chat?.id;
    // Check if user is admin
    const admin = await prisma.admin.findFirst({
      where: { chat_id: chatId.toString() },
    });

    if (!chatId) {
      return ctx.reply("Unable to retrieve chat ID.");
    }

    if (admin) {
      // Admin help message (Amharic & English)
      return ctx.reply(
        `👋 <b>እንኳን ወደ አድሚን ፓነል በደህና መጡ!</b>\n\n` +
          `ይህ ቦት የተማሪዎችን ሁኔታ ማየት፣ መልእክት ላክ እና የትምህርት ጥራት ማጣራት ይረዳዎታል።\n\n` +
          `• <b>/login</b> – ወደ አድሚን ድህረገፅ ይግቡ።\n` +
          `• <b>/admin</b> – ተማሪዎችን ያስተዳድሩ እና መልእክት ይላኩ።\n` +
          `• <b>/start</b> – የትምህርት መጀመሪያ ገጽ ይመልከቱ።\n\n` +
          `Welcome to the Admin Portal!\n\n` +
          `This bot helps you manage students, send messages, and monitor course quality.\n\n` +
          `• <b>/login</b> – Access the admin website.\n` +
          `• <b>/admin</b> – Manage students and send messages in the bot.\n` +
          `• <b>/start</b> – Start learning the course as a student.\n\n` +
          `እንኳን ደህና መጡ!`,
        { parse_mode: "HTML" }
      );
    }

    // For students, use Telegram Mini App approach
    try {
      // Get the raw init data from Telegram
      const initDataRaw = retrieveRawInitData();

      console.log("Raw init data:", initDataRaw);

      // Find student by chat_id
      const student = await prisma.wpos_wpdatatable_23.findFirst({
        where: {
          chat_id: chatId.toString(),
          status: { in: ["Active", "Not yet", "On progress"] },
        },
        select: {
          wdt_ID: true,
          name: true,
          subject: true,
          package: true,
          isKid: true,
          activePackage: {
            where: { isPublished: true },
            select: {
              id: true,
              name: true,
              courses: {
                where: { order: 1 },
                select: {
                  id: true,
                  title: true,
                  chapters: {
                    where: { position: 1 },
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!student) {
        return ctx.reply("🚫 የኮርሱን ፕላትፎርም ለማግኘት አልተፈቀደለዎትም! አድሚኑን ያነጋግሩ፡፡");
      }

      // Create the student page URL with init data
      const studentPageUrl = `${BASE_URL}/en/student/${
        student.wdt_ID
      }?initData=${encodeURIComponent(initDataRaw)}`;

      // Create web app button
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: `📚 የ${student.name || "ዳሩል-ኩብራ"}ን የትምህርት ገጽ ይክፈቱ`,
                web_app: { url: studentPageUrl },
              },
            ],
          ],
        },
      };

      await ctx.reply(
        "✅ እንኳን ወደ ዳሩል-ኩብራ የቁርአን ማእከል በደህና መጡ! ኮርሱን ለመከታተል ከታች ያለውን ማስፈንጠሪያ ይጫኑ፡፡",
        keyboard
      );
    } catch (error) {
      console.error("Error in start command:", error);
      await ctx.reply("❌ አንድ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።");
    }
  });
  // 4. Handle package selection
  bot.callbackQuery(/choose_package_(.+)/, async (ctx) => {
    const chatId = ctx.chat?.id;
    const packageId = ctx.match[1].split("@")[0];
    const wdt_ID = Number(ctx.match[1].split("@")[1]);
    console.log("Selected package:", packageId, "for student ID:", wdt_ID);
    // Set the chosen package as active for the student
    const validPackage = await prisma.coursePackage.findUnique({
      where: { id: packageId },
    });
    if (!validPackage) {
      return ctx.reply("🚫 ይህ ፓኬጅ አልተገኘም። አድሚኑን ያነጋግሩ፡");
    }
    await prisma.wpos_wpdatatable_23.update({
      where: {
        chat_id: chatId?.toString(),
        wdt_ID: wdt_ID,
        status: { in: ["Active", "Not yet", "On progress"] },
      },
      data: {
        youtubeSubject: packageId,
      },
    });

    const studentName = await prisma.wpos_wpdatatable_23.findFirst({
      where: {
        wdt_ID,
      },
      select: {
        name: true,
      },
    });

    // Fetch the package details (including first course/chapter)
    const activePackage = await prisma.coursePackage.findUnique({
      where: { id: packageId },
      select: {
        id: true,
        name: true,
        courses: {
          where: { order: 1 },
          select: {
            id: true,
            title: true,
            chapters: {
              where: { position: 1 },
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (
      !activePackage ||
      !activePackage.courses.length ||
      !activePackage.courses[0].chapters.length
    ) {
      return ctx.reply("🚫 ይህ ፓኬጅ ትምህርት አይዟትም። አድሚኑን ያነጋግሩ፡፡");
    }

    // Ensure student progress exists
    const course = activePackage.courses[0];
    const chapter = course.chapters[0];
    const studentProgress = await prisma.studentProgress.findFirst({
      where: {
        studentId: wdt_ID,
        chapterId: chapter.id,
      },
    });

    if (!studentProgress) {
      await prisma.studentProgress.create({
        data: {
          studentId: wdt_ID,
          chapterId: chapter.id,
          isCompleted: false,
        },
      });
    }

    // Send the learning link
    const lang = "en";
    const stud = "student";
    const update = await updatePathProgressData(wdt_ID);
    if (!update) {
      return undefined;
    }
    const url = `${BASE_URL}/${lang}/${stud}/${wdt_ID}/${update[0]}/${update[1]}`;

    const packageName = activePackage.name || "የተማሪ ፓኬጅ";
    const openKeyboard = new InlineKeyboard().webApp(
      `📚 የ${studentName?.name ?? "Darulkubra"}ን የ${packageName}ትምህርት ገጽ ይክፈቱ`,
      url
    );

    await ctx.reply(
      "✅  እንኳን ወደ ዳሩል-ኩብራ የቁርአን ማእከል በደህና መጡ! ኮርሱን ለመከታተል ከታች ያለውን ማስፈንጠሪያ ይጫኑ፡፡",
      {
        reply_markup: openKeyboard,
      }
    );
  });
  // bot.on("message", (ctx) => ctx.reply("Got another message!"));

  bot.catch((err) => {
    console.error("Error in middleware:", err);
  });

  // bot.start();
  console.log("Telegram bot started successfully.");
  // sendMessagesToAllStudents();

  bot.command("login", async (ctx) => {
    // Show an inline button that triggers a callback query
    const keyboard = new InlineKeyboard().text("🔑 Login", "admin_login_check");
    await ctx.reply("Please click the button below to login:", {
      reply_markup: keyboard,
    });
  });

  // Handle the callbackQuery for the login button
  bot.callbackQuery("admin_login_check", async (ctx) => {
    const chatId = ctx.chat?.id;
    // Check if user is admin
    const admin = await prisma.admin.findFirst({
      where: { chat_id: chatId?.toString() },
    });

    if (admin) {
      // If admin, show web app button
      const keyboard = new InlineKeyboard().webApp(
        "🔑 Open Admin WebApp",
        "https://darelkubra.com:5000/en/login" // Replace with your actual web app URL
      );
      await ctx.editMessageText(
        "Welcome, admin! Click below to open the admin web app:",
        {
          reply_markup: keyboard,
        }
      );
    } else {
      await ctx.editMessageText(
        "🚫 You are not authorized to access the admin web app."
      );
    }
  });

  // Store admin's pending message context
  const pendingAdminMessages: Record<
    number,
    {
      packageId: string;
      status: string;
      message?: string;
      chatIds?: number[];
      studentName?: string[];
      studentId?: number[];
    }
  > = {};

  // Store time restrictions for zoom link sending
  const zoomTimeRestrictions: Record<
    number, // teacherId
    {
      packageId: string;
      lastSentTime: Date;
    }[]
  > = {};

  // Store zoom links temporarily for callback handling
  const zoomLinks: Record<string, string> = {};

  // Clean up expired restrictions every 10 minutes
  setInterval(() => {
    const now = new Date();
    const timeRestrictionMs = 5 * 60 * 1000; // 5 minutes restriction

    for (const teacherId in zoomTimeRestrictions) {
      zoomTimeRestrictions[teacherId] = zoomTimeRestrictions[teacherId].filter(
        (restriction) =>
          now.getTime() - restriction.lastSentTime.getTime() < timeRestrictionMs
      );

      // Remove empty teacher entries
      if (zoomTimeRestrictions[teacherId].length === 0) {
        delete zoomTimeRestrictions[teacherId];
      }
    }

    // Clean up old zoom links (clean up all for now)
    for (const key in zoomLinks) {
      // For now, we'll clean up all zoom links since we don't store timestamps
      // In a production system, you'd want to store timestamps with the links
      delete zoomLinks[key];
    }
  }, 10 * 60 * 1000); // Clean up every 10 minutes

  // Admin command
  bot.command("admin", async (ctx) => {
    const chatId = ctx.chat?.id;
    try {
      const user = await prisma.admin.findFirst({
        where: { chat_id: chatId?.toString() },
      });

      if (user) {
        const keyboard = new InlineKeyboard()
          .text("📊 ዳሽቦርድ", "admin_dashboard_page_1")
          .row()
          .text("✉️ መልእክት ላክ", "admin_send");
        await ctx.reply(
          "👋 እንኳን ወደ አድሚን ፓነል በደህና መጡ!\n\n" +
            "ከዚህ በታች ያሉትን ቁልፎች በመጠቀም የተማሪዎችን አካውንት መከታተል፣ መልእክት መላክ እና የትምህርት ጥራት ማጣራት ይችላሉ።\n\n" +
            "• <b>📊 ዳሽቦርድ</b> – የተማሪዎችን ሁኔታ ይመልከቱ።\n" +
            "• <b>✉️ መልእክት ላክ</b> – ለተመረጡ ተማሪዎች መልእክት ይላኩ።",
          { reply_markup: keyboard, parse_mode: "HTML" }
        );
      } else {
        await ctx.reply("🚫 ይቅርታ፣ ወደ አድሚን ፓነል መግባት አትችሉም።");
      }
    } catch (error) {
      console.error("❌ DB ERROR:", error);
      await ctx.reply("❌ የውሂብ ችግር።");
    }
  });
  // Ustaz command
  bot.command("ustaz", async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) {
      return;
    }
    try {
      const user = await prisma.ustaz.findFirst({
        where: { chat_id: chatId + "" },
      });

      if (user) {
        const keyboard = new InlineKeyboard().text("✉️ ሊንክ ላክ", "ustaz_send");
        await ctx.reply(
          "👋 እንኳን ወደ ኡስታዝ ፓነል በደህና መጡ!\n\n" +
            "ከዚህ በታች ያለውን ቁልፍ በመጠቀም ለተማሪዎ ሊንክ መላክ ይችላሉ።\n\n" +
            "• <b>✉️ ሊንክ ላክ</b> – ለተመረጡ ተማሪዎች ሊንክ ይላኩ።",
          { reply_markup: keyboard, parse_mode: "HTML" }
        );
      } else {
        await ctx.reply("🚫 ይቅርታ፣ ወደ ኡስታዝ ፓነል መግባት አትችሉም።");
      }
    } catch (error) {
      console.error("❌ DB ERROR:", error);
      await ctx.reply("❌ የውሂብ ችግር።");
    }
  });

  // Step 0: When admin clicks "መልእክት ላክ", show two options
  bot.callbackQuery("admin_send", async (ctx) => {
    await ctx.answerCallbackQuery();
    const keyboard = new InlineKeyboard()
      .text("ለአንዱ ተማሪ መልእክት ላክ", "admin_send_individual")
      .row()
      .text("ፓኬጅ በመምረጥ መልእክት ላክ", "admin_send_package");
    await ctx.reply("እባክዎ የመልእክት አይነት ይምረጡ:", { reply_markup: keyboard });
  });

  // Step 1a: If "Send by package" is selected, continue as before
  bot.callbackQuery("admin_send_package", async (ctx) => {
    await ctx.answerCallbackQuery();
    const packages = await allPackages();
    if (!packages || packages.length === 0) {
      await ctx.reply("ምንም ፓኬጅ አልተገኘም።");
      return;
    }
    const keyboard = new InlineKeyboard();
    for (const pkg of packages) {
      keyboard
        .text(
          `${pkg.name} -- ጠቅላላ ተማሪ ${pkg.totalStudents}`,
          `admin_package_${pkg.id}`
        )
        .row();
    }
    await ctx.reply("📦 ፓኬጅ ይምረጡ:", { reply_markup: keyboard });
  });

  // Step 1b: If "Send to individual" is selected, ask for student ID
  bot.callbackQuery("admin_send_individual", async (ctx) => {
    await ctx.answerCallbackQuery();
    const adminId = ctx.chat?.id;
    if (adminId) {
      pendingAdminMessages[adminId] = { packageId: "", status: "individual" };
    }
    await ctx.reply("እባክዎ የተማሪውን ID ያስገቡ:");
  });

  // Temporary in-memory log (replace with DB or file if needed)
  const blockedMessagesLog: {
    senderId: number;
    senderName?: string;
    reason: string;
    content: string;
    timestamp: string;
  }[] = [];

  // Admin to notify (can be a group or individual)
  const notifyAdminId = process.env.NOTIFY_ADMIN_ID || 1682939643; // Replace with your notification admin ID

  bot.on(["message:text", "message:photo", "message:voice"], async (ctx) => {
    const senderId = ctx.chat?.id;
    const senderName = ctx.chat?.first_name || ctx.chat?.username || "Unknown";
    const pending = senderId ? pendingAdminMessages[senderId] : undefined;
    if (!pending || !pending.chatIds?.length) return;

    const ADMIN_IDS = admins.map((a) => Number(a.chat_id)); // Replace with actual admin IDs
    const isAdmin = ADMIN_IDS.includes(senderId);
    // Restrict non-admins to text only
    if (!isAdmin && !ctx.message.text) {
      console.log("mubarek");
      const reason = "Attempted to send media";
      const content = JSON.stringify(ctx.message, null, 2);

      // Log violation
      blockedMessagesLog.push({
        senderId,
        senderName,
        reason,
        content,
        timestamp: new Date().toISOString(),
      });

      // Notify admin
      await ctx.api.sendMessage(
        notifyAdminId,
        `🚫 Teacher ${senderName} (${senderId}) tried to send media.\nReason: ${reason}`
      );

      await ctx.reply("❌ ፎቶ፣ ድምጽ ወይም ሌላ ፋይል መላክ አይቻልም። ጽሑፍ ብቻ ያስገቡ።");
      return;
    }

    // Restrict non-admins from sending non-Zoom links
    if (!isAdmin && ctx.message.text) {
      const text = ctx.message.text.trim();
      const containsLink = /https?:\/\/[^\s]+/i.test(text);
      const isZoomLink = /https?:\/\/(?:[\w-]+\.)?zoom\.us\/[^\s]*/i.test(text);

      if (text && !containsLink && !isZoomLink) {
        const reason = "Non-Zoom link detected";
        const content = text;

        // Log violation
        blockedMessagesLog.push({
          senderId,
          senderName,
          reason,
          content,
          timestamp: new Date().toISOString(),
        });

        // Notify admin
        await ctx.api.sendMessage(
          notifyAdminId,
          `🚫 Teacher ${senderName} (${senderId}) tried to send a non-Zoom link.\nContent: ${text}`
        );

        await ctx.reply("❌ ዙም (Zoom) ካልሆነ ማንኛውም አድራሻ መላክ አይቻልም።");
        return;
      }
    }

    // Remove pending state
    delete pendingAdminMessages[senderId];

    // Prepare content
    let sendFn;
    if (ctx.message.text) {
      sendFn = (id: number) => ctx.api.sendMessage(id, ctx.message.text!);
    } else if (ctx.message.photo && isAdmin) {
      const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      sendFn = (id: number) =>
        ctx.api.sendPhoto(id, fileId, { caption: ctx.message.caption });
    } else if (ctx.message.voice && isAdmin) {
      const fileId = ctx.message.voice.file_id;
      sendFn = (id: number) =>
        ctx.api.sendVoice(id, fileId, { caption: ctx.message.caption });
    } else {
      await ctx.reply("❌ የሚደገፍ ያልሆነ ዓይነት መልእክት።");
      return;
    }
    console.log("chatIds", pending.chatIds);

    // Send to all selected students
    const sent: number[] = [];
    const failed: number[] = [];
    const studentsName: string[] = pending.studentName ?? [];
    const studentsId: number[] = pending.studentId ?? [];

    for (const chatId of pending.chatIds) {
      try {
        const studentName = studentsName.shift() ?? "ተማሪ";
        const studentId = studentsId.shift() ?? "";

        console.log(
          `Attempting to send message to chatId: ${chatId}, student: ${studentName}`
        );

        // Check if student exists and is active before sending
        const studentExists = await prisma.wpos_wpdatatable_23.findFirst({
          where: {
            chat_id: String(chatId),
            status: { in: ["Active", "Not yet", "On progress"] },
          },
          select: { wdt_ID: true, name: true, status: true },
        });

        if (!studentExists) {
          console.log(
            `Student with chatId ${chatId} not found or inactive, skipping`
          );
          failed.push(chatId);
          continue;
        }

        console.log(
          `Student found: ${studentExists.name} (ID: ${studentExists.wdt_ID}, Status: ${studentExists.status})`
        );

        if (!isAdmin && ctx.message.text) {
          // Check time restriction for sending zoom links
          // Time restriction removed - teachers can send zoom links freely

          // Create a shorter callback data to avoid BUTTON_DATA_INVALID error
          // Telegram callback data has a 64-byte limit and doesn't allow special characters
          // Remove student name to avoid issues with special characters and length
          const callbackData = `join_zoom~${pending.packageId}~${studentId}`;

          // Validate callback data length (Telegram limit is 64 bytes)
          if (callbackData.length > 64) {
            console.error(
              `Callback data too long: ${callbackData.length} bytes`
            );
            // Fallback: send without button
            await ctx.api.sendMessage(
              chatId,
              `📚የ ${studentName} የትምህርት ሊንክ፦\n\n${ctx.message.text}`
            );
            sent.push(chatId);
            continue;
          }

          // Store zoom link temporarily for callback handling
          const linkKey = `${pending.packageId}~${studentId}`;
          zoomLinks[linkKey] = ctx.message.text;

          const buttonMarkup = {
            reply_markup: {
              inline_keyboard: [
                [{ text: "✅ Get Zoom Link", callback_data: callbackData }],
              ],
            },
          };

          console.log(
            `Sending zoom link message to ${chatId} for student ${studentName}`
          );
          await ctx.api.sendMessage(
            chatId,
            `📚የ ${studentName} የትምህርት ሊንክ፦\n\nእባክዎን ከታች ያለውን ቁልፍ በመጫን ተገኝተው ያረጋግጡ።`,
            buttonMarkup
          );
          console.log(`Successfully sent message to ${chatId}`);
        } else {
          console.log(`Sending regular message to ${chatId}`);
          await sendFn(chatId);
          console.log(`Successfully sent regular message to ${chatId}`);
        }

        sent.push(chatId);
        console.log(`Added ${chatId} to sent list`);
      } catch (err) {
        console.error(`Failed to send message to ${chatId}:`, err);
        failed.push(chatId);
        console.log(`Added ${chatId} to failed list`);
      }
    }

    // Notify admin
    if (sent.length > 0 && !isAdmin) {
      const statsuOfStudent = await prisma.subjectPackage.findMany({
        where: { packageId: pending.packageId },
        select: {
          subject: true,
          packageType: true,
          kidpackage: true,
        },
      });
      for (const s of statsuOfStudent) {
        // Fetch all students with matching package type and kid package
        const allStudents = await prisma.wpos_wpdatatable_23.findMany({
          where: {
            package: s.packageType,
            isKid: s.kidpackage,
            chat_id: { in: sent.map(String) },
            status: { in: ["Active", "Not yet", "On progress"] },
          },
          select: {
            wdt_ID: true,
            name: true,
            subject: true,
          },
        });

        // Filter students using subject matching logic for comma-separated subjects
        const students = allStudents.filter(
          (student) =>
            student.subject &&
            s.subject &&
            hasMatchingSubject(student.subject, s.subject)
        );

        console.log(
          `Creating attendance records for ${students.length} students for package ${pending.packageId}`
        );

        await Promise.all(
          students.map(async (student) => {
            console.log(
              `Processing student ${student.wdt_ID} (${student.name})`
            );

            const lastAttendance = await prisma.tarbiaAttendance.findFirst({
              where: {
                studId: student.wdt_ID,
                packageId: pending.packageId,
              },
              orderBy: {
                createdAt: "desc",
              },
              select: {
                id: true,
                createdAt: true,
                status: true,
              },
            });

            console.log(
              `Last attendance for student ${student.wdt_ID}:`,
              lastAttendance
            );

            const now = new Date();
            const oneHourMs = 60 * 60 * 1000;
            const isWithinOneHour =
              lastAttendance?.createdAt &&
              now.getTime() - lastAttendance.createdAt.getTime() <= oneHourMs;

            console.log(
              `Is within one hour for student ${student.wdt_ID}:`,
              isWithinOneHour
            );

            if (isWithinOneHour && lastAttendance?.id) {
              console.log(
                `Updating existing attendance record for student ${student.wdt_ID}`
              );
              await prisma.tarbiaAttendance.update({
                where: { id: lastAttendance.id },
                data: {
                  createdAt: new Date(),
                  status: false, // Keep as false until student clicks the button
                },
              });
            } else {
              console.log(
                `Creating new attendance record for student ${student.wdt_ID}`
              );
              await prisma.tarbiaAttendance.create({
                data: {
                  studId: student.wdt_ID,
                  packageId: pending.packageId,
                  status: false, // Keep as false until student clicks the button
                },
              });
            }
          })
        );

        console.log("Attendance records creation completed");
      }
    }

    console.log(
      `Final results - Sent: ${sent.length}, Failed: ${failed.length}`
    );
    console.log(`Sent chatIds:`, sent);
    console.log(`Failed chatIds:`, failed);

    // Only notify admin about failed deliveries if there are actually failed ones
    if (failed.length > 0) {
      const failedIds = await prisma.wpos_wpdatatable_23.findMany({
        where: {
          chat_id: { in: failed.map(String) },
          status: { in: ["Active", "Not yet", "On progress"] },
        },
        select: {
          name: true,
          wdt_ID: true,
        },
      });

      if (failedIds.length > 0) {
        await ctx.api.sendMessage(
          notifyAdminId,
          `ሊንክ ያልደረሳቸው ተማሪዎች (${failedIds.length}):`
        );
        for (const f of failedIds) {
          await ctx.api.sendMessage(
            notifyAdminId,
            `Name: ${f.name} | ID: ${f.wdt_ID}`
          );
        }
      }
    }
    // if (isAdmin) {
    //   await ctx.reply(
    //     `✅ ለ${sent.length} ተማሪ${sent.length > 1 ? "ዎች" : ""} ተልኳል።${
    //       failed.length > 0 ? ` ❌ አልተላከላቸውም: ${failed.length}` : ""
    //     }`
    //   );
    // } else {
    //   await ctx.reply(
    //     `${
    //       failed.length === 0 && sent.length > 0
    //         ? "✅ ለሁሉም ተማሪዎች ተልኳል"
    //         : failed.length > 0
    //         ? `❌ ያልተላከለት ተማሪ አለ (${failed.length})`
    //         : "❌ ምንም ተማሪ አልተላከለትም"
    //     }`
    //   );
    // }
    await ctx.reply(
      `✅ ለ${sent.length} ተማሪ${sent.length > 1 ? "ዎች" : ""} ተልኳል።${
        failed.length > 0
          ? ` ❌ ለ${failed.length} ተማሪ${failed.length > 1 ? "ዎች" : ""} አልተላከም`
          : "ያልተላከለት ተማሪ የለም"
      }`
    );
  });

  // Step 2: Show status options after package selection
  bot.callbackQuery(/admin_package_(.+)/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const packageId = ctx.match[1];
    console.log("Selected package ID:", packageId);
    if (ctx.chat?.id) {
      // pendingAdminMessages[ctx.chat.id] = { packageId, status: "" };
    }

    // Get status counts for this package
    const statusCounts = await filterStudentsByPackageList(packageId);
    console.log("Status counts:", statusCounts);

    const statusMap: Record<string, number> = {
      completed: 0,
      notstarted: 0,
      inprogress_0: 0,
      inprogress_10: 0,
      inprogress_40: 0,
      inprogress_70: 0,
      inprogress_o: 0,
    };
    if (Array.isArray(statusCounts)) {
      for (const s of statusCounts) {
        statusMap[s.status] = s.count;
      }
    }

    // 2 in first row, 4 in second row
    const keyboard = new InlineKeyboard()
      .row()
      .text(
        `✅ ተጠናቀቀ (${statusMap.completed})`,
        `admin_status_${packageId}_completed`
      )
      .row()
      .text(
        `❌ አልጀመረም (${statusMap.notstarted})`,
        `admin_status_${packageId}_notstarted`
      )
      .row()
      .text(
        `0️⃣ 0% (${statusMap.inprogress_0})`,
        `admin_status_${packageId}_inprogress_0`
      )
      .row()
      .text(
        `🔟 10% (${statusMap.inprogress_10})`,
        `admin_status_${packageId}_inprogress_10`
      )
      .row()
      .text(
        `⏳ 40% (${statusMap.inprogress_40})`,
        `admin_status_${packageId}_inprogress_40`
      )
      .row()
      .text(
        `🕗 70% (${statusMap.inprogress_70})`,
        `admin_status_${packageId}_inprogress_70`
      )
      .row()
      .text(
        `🟡 ቀሪዎች (${statusMap.inprogress_o})`,
        `admin_status_${packageId}_inprogress_o`
      );
    await ctx.reply("የተማሪዎችን ሁኔታ ይምረጡ:", { reply_markup: keyboard });
  });

  // Step 3: Prompt for message after status selection and show filtered chat_ids
  bot.callbackQuery(
    /admin_status_(.+)_(completed|notstarted|inprogress_0|inprogress_10|inprogress_40|inprogress_70|inprogress_o)/,
    async (ctx) => {
      await ctx.answerCallbackQuery();
      const [, packageId, status] = ctx.match;
      const adminId = ctx.chat?.id;
      if (!adminId) return;

      // Pass status directly to your filter function
      const chatIds = await filterStudentsByPackageandStatus(packageId, status);

      if (!chatIds.length) {
        await ctx.reply("ለተመረጠው ፓኬጅ እና ሁኔታ ምንም ተማሪ አልተገኘም።");
        return;
      }

      // Save pending state
      pendingAdminMessages[adminId] = {
        packageId,
        status,
        chatIds: chatIds.map(Number),
      };

      // Show prompt and cancel button
      const keyboard = new InlineKeyboard().text("❌ ሰርዝ", "admin_cancel_send");
      await ctx.reply("✍️ ለመላክ የሚፈልጉትን መልእክት (ጽሑፍ፣ ፎቶ፣ ወይም ድምጽ) ይጻፉ፡፡", {
        reply_markup: keyboard,
      });
    }
  );

  // Cancel handler
  bot.callbackQuery("admin_cancel_send", async (ctx) => {
    const adminId = ctx.chat?.id;
    if (adminId) delete pendingAdminMessages[adminId];
    await ctx.answerCallbackQuery();
    await ctx.reply("❌ መላክ ተሰርዟል።");
  });

  // Dashboard with pagination (unchanged)
  bot.callbackQuery(/admin_dashboard_page_(\d+)/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const match = ctx.callbackQuery.data.match(/admin_dashboard_page_(\d+)/);
    const page = match && match[1] ? parseInt(match[1]) : 1;

    const { data, pagination } = await getStudentAnalyticsperPackage(
      undefined,
      page,
      5
    );

    let msg = `📊 <b>የተማሪ ትንታኔ (ገፅ ${pagination.currentPage}/${pagination.totalPages})</b>\n\n`;
    if (data.length === 0) {
      msg += "ተማሪዎች አልተገኙም።";
    } else {
      msg += data
        .map(
          (s, i) =>
            `<b>${i + 1 + (pagination.currentPage - 1) * 5}. ${
              s?.name ?? "N/A"
            }</b>\n` +
            `መለያ: <code>${s?.id}</code>\n` +
            `ስልክ: <code>${s?.phoneNo ?? "N/A"}</code>\n` +
            `ልጅ ነው?: <code>${s?.isKid ? "አዎ" : "አይደለም"}</code>\n` +
            `ፓኬጅ: <code>${s?.activePackage}</code>\n` +
            `እድገት: <code>${s?.studentProgress}</code>\n`
        )
        .join("\n");
    }

    const keyboard = new InlineKeyboard();
    if (pagination.hasPreviousPage)
      keyboard.text(
        "⬅️ ቀዳሚ",
        `admin_dashboard_page_${pagination.currentPage - 1}`
      );
    if (pagination.hasNextPage)
      keyboard.text(
        "ቀጣይ ➡️",
        `admin_dashboard_page_${pagination.currentPage + 1}`
      );
    keyboard.row().text("🏠 መነሻ", "admin_dashboard_home");

    if (ctx.update.callback_query.message) {
      await ctx.editMessageText(msg, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } else {
      await ctx.reply(msg, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    }
  });

  // Home button handler (returns to main menu)
  bot.callbackQuery("admin_dashboard_home", async (ctx) => {
    await ctx.answerCallbackQuery();
    const keyboard = new InlineKeyboard()
      .text("📊 ዳሽቦርድ", "admin_dashboard_page_1")
      .row()
      .text("✉️ መልእክት ላክ", "admin_send");
    await ctx.editMessageText("👋 እንኳን ወደ አድሚን ፓነል በደህና መጡ!", {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery("/package_selection_(.+)/", async (ctx) => {
    await ctx.answerCallbackQuery();
    const keyboard = new InlineKeyboard()
      .text("📊 ዳሽቦርድ", "admin_dashboard_page_1")
      .row()
      .text("✉️ መልእክት ላክ", "admin_send");
    await ctx.editMessageText("👋 እንኳን ወደ አድሚን ፓነል በደህና መጡ!", {
      reply_markup: keyboard,
    });
  });
  // bot.start();
  console.log("✅ አድሚን ቦት ተጀምሯል።");

  // Step 0: When admin clicks "መልእክት ላክ", show two options
  bot.callbackQuery("ustaz_send", async (ctx) => {
    await ctx.answerCallbackQuery();
    const keyboard = new InlineKeyboard().text(
      "ፓኬጅ በመምረጥ መልእክት ላክ",
      "ustaz_send_package"
    );
    await ctx.reply("እባክዎ የመልእክት አይነት ይምረጡ:", { reply_markup: keyboard });
  });

  // Step 1a: If "Send by package" is selected, continue as before
  bot.callbackQuery("ustaz_send_package", async (ctx) => {
    await ctx.answerCallbackQuery();

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    // Step 1: Find the ustaz by chat_id
    const ustaz = await prisma.ustaz.findFirst({
      where: { chat_id: chatId.toString() },
    });

    if (!ustaz) {
      await ctx.reply("🚫 ይቅርታ፣ እባኮትን እርስዎን አልተመዘገቡም።");
      return;
    }

    // Step 2: Get only packages assigned to this ustaz
    const packages = await prisma.coursePackage.findMany({
      where: { ustazId: ustaz.wdt_ID },
    });

    if (!packages || packages.length === 0) {
      await ctx.reply("📦 ምንም ፓኬጅ አልተመዘገበም።");
      return;
    }

    // Step 3: Build the keyboard
    const keyboard = new InlineKeyboard();
    for (const pkg of packages) {
      keyboard.text(`${pkg.name}`, `ustaz_package_${pkg.id}`).row();
    }

    await ctx.reply("📦 የእርስዎን ፓኬጅ ይምረጡ:", { reply_markup: keyboard });
  });

  // Step 2: Show status options after package selection
  bot.callbackQuery(/ustaz_package_(.+)/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const packageId = ctx.match[1];
    console.log("Selected package ID:", packageId);

    // Get ustaz ID first
    const ustazChatId = ctx.from?.id;
    const ustzId = await prisma.ustaz.findFirst({
      where: { chat_id: ustazChatId + "" },
    });

    if (!ustzId?.ustazid) return;

    if (ctx.chat?.id) {
      // pendingAdminMessages[ctx.chat.id] = { packageId, status: "" };
    }

    // Get student counts for both options
    const allStudentsCount = await getStudentsByPackage(packageId).then(
      (students) => students.length
    );
    // const myStudentsCount = await getStudentsByPackageAndTeacher(packageId, ustzId.ustazid + "").then(students => students.length);

    const keyboard = new InlineKeyboard()
      .row()
      .text(
        `✅ ፓኬጁን ለሚወስዱት በሙሉ (${allStudentsCount} ተማሪዎች)`,
        `ustaz_status_${packageId}_all`
      );
    // .row()
    // .text(`✅ ፓኬጁን ለሚወስዱት የኔ ተማሪዎች ብቻ (${myStudentsCount} ተማሪዎች)`, `ustaz_status_${packageId}_my`);

    await ctx.reply("የተማሪዎችን ሁኔታ ይምረጡ:", { reply_markup: keyboard });
  });

  // Step 3: Prompt for message after status selection and show filtered chat_ids
  bot.callbackQuery(
    /ustaz_status_(.+)_(completed|notstarted|inprogress_0|inprogress_10|inprogress_40|inprogress_70|inprogress_o|all|my)/,
    async (ctx) => {
      await ctx.answerCallbackQuery();
      const [, packageId, status] = ctx.match;
      const ustazChatId = ctx.from?.id;
      const ustzId = await prisma.ustaz.findFirst({
        where: { chat_id: ustazChatId + "" },
      });
      if (!ustzId?.ustazid) return;
      const adminId = ctx.chat?.id;
      if (!adminId) return;
      const chatIds: number[] = [];
      const studentsIds: number[] = [];
      const studentsNames: string[] = [];

      // Pass status directly to your filter function
      if (status === "my") {
        const chat_ids = await getStudentsByPackageAndTeacher(
          packageId,
          ustzId.ustazid + ""
        );
        chat_ids.map((chat_id) => {
          chatIds.push(Number(chat_id.chat_id));
          studentsIds.push(Number(chat_id.wdt_ID));
          studentsNames.push(chat_id.name + "");
        });
      } else {
        const chat_ids = await getStudentsByPackage(packageId);
        chat_ids.map((chat_id) => {
          chatIds.push(Number(chat_id.chat_id));
          studentsIds.push(Number(chat_id.wdt_ID));
          studentsNames.push(chat_id.name + "");
        });
      }
      if (!chatIds.length) {
        await ctx.reply("ለተመረጠው ፓኬጅ እና ሁኔታ ምንም ተማሪ አልተገኘም።");
        return;
      }

      // Save pending state
      pendingAdminMessages[adminId] = {
        packageId,
        status,
        chatIds: chatIds.map((ch) => Number(ch)),
        studentId: studentsIds.map((ch) => Number(ch)),
        studentName: studentsNames.map((ch) => String(ch)),
      };

      // Show prompt and cancel button
      const keyboard = new InlineKeyboard().text("❌ ሰርዝ", "ustaz_cancel_send");
      await ctx.reply("✍️ ለመላክ የሚፈልጉትን የዙም ሊንክ ያስገቡ እና ይላኩ፡፡", {
        reply_markup: keyboard,
      });
    }
  );
  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const chatId = ctx.chat?.id;

    console.log("Callback query received:", data, "from chat:", chatId);

    if (!data.startsWith("join_zoom~")) return;

    const [, packageId, wdt_ID] = data.split("~");

    console.log("Parsed callback data:", { packageId, wdt_ID });

    // Get the stored zoom link
    const linkKey = `${packageId}~${wdt_ID}`;
    const zoomLink = zoomLinks[linkKey];

    if (!zoomLink) {
      console.log(`Zoom link not found for key: ${linkKey}`);
      // await ctx.reply("❌ የዙም ሊንክ አልተገኘም። አድሚኑን ያነጋግሩ።");
      return;
    }

    console.log("Retrieved zoom link:", zoomLink);

    // Step 1: Get student info
    const student = await prisma.wpos_wpdatatable_23.findFirst({
      where: {
        chat_id: String(chatId),
        status: { in: ["Active", "Not yet", "On progress"] },
        wdt_ID: Number(wdt_ID),
      },
      select: {
        wdt_ID: true,
        name: true,
      },
    });

    console.log("Student found:", student);

    if (!student) {
      console.log("Student not found for:", { chatId, wdt_ID });
      await ctx.reply("❌ ተማሪ አልተገኘም። አድሚኑን ያነጋግሩ።");
      return;
    }

    // Step 2: Get last attendance record
    const lastCreatedAttendance = await prisma.tarbiaAttendance.findFirst({
      where: {
        studId: student.wdt_ID,
        packageId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        createdAt: true,
        status: true,
      },
    });

    console.log("Last attendance record:", lastCreatedAttendance);

    // Step 3: Check if the button was clicked within 1 hour
    const now = new Date();
    const sentTime = lastCreatedAttendance?.createdAt;
    const oneHourMs = 60 * 60 * 1000;

    console.log("Time check:", {
      now: now.toISOString(),
      sentTime: sentTime?.toISOString(),
      timeDiff: sentTime ? now.getTime() - sentTime.getTime() : null,
      oneHourMs,
    });

    if (sentTime && now.getTime() - sentTime.getTime() <= oneHourMs) {
      // ✅ Within 1 hour — mark attendance and send Zoom link
      console.log(
        "Updating attendance to present for student:",
        student.wdt_ID
      );

      await prisma.tarbiaAttendance.update({
        where: {
          id: lastCreatedAttendance?.id,
        },
        data: {
          status: true,
        },
      });

      console.log("Attendance updated successfully");

      // Create a direct Zoom Workspace button that opens the app
      const zoomButtonMarkup = {
        reply_markup: {
          inline_keyboard: [[{ text: "🔗 Join Meeting", url: zoomLink }]],
        },
      };

      // Clean up the zoom link from memory after successful access
      delete zoomLinks[linkKey];
      console.log(`Cleaned up zoom link for key: ${linkKey}`);

      await ctx.reply(
        `✅ እንኳን ደህና መጡ ${student.name}። ትምህርቱን በደህና ይከታተሉ።`,
        zoomButtonMarkup
      );
    } else {
      // ❌ Expired — send fallback message
      const update = await updatePathProgressData(student.wdt_ID);
      if (!update) {
        return undefined;
      }
      const lang = "en";
      const stud = "student";
      const url = `${BASE_URL}/${lang}/${stud}/${student.wdt_ID}/${update[0]}/${update[1]}`;
      const channelName = student.name || "ዳሩል-ኩብራ";
      const keyboard = new InlineKeyboard().webApp(
        `📚 የ${channelName}ን የትምህርት ገጽ ይክፈቱ`,
        url
      );
      await ctx.reply(`⏰ ይቅርታ፣ የዙም ሊንኩ ጊዜው አልፎበታል።ት/ትዎን ይከታተሉ፡፡`, {
        reply_markup: keyboard,
      });
    }
  });

  // Cancel handler
  bot.callbackQuery("ustaz_cancel_send", async (ctx) => {
    const adminId = ctx.chat?.id;
    if (adminId) delete pendingAdminMessages[adminId];
    await ctx.answerCallbackQuery();
    await ctx.reply("❌ መላክ ተሰርዟል።");
  });

  // Dashboard with pagination (unchanged)
  bot.callbackQuery(/ustaz_dashboard_page_(\d+)/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const match = ctx.callbackQuery.data.match(/ustaz_dashboard_page_(\d+)/);
    const page = match && match[1] ? parseInt(match[1]) : 1;

    const { data, pagination } = await getStudentAnalyticsperPackage(
      undefined,
      page,
      5
    );

    let msg = `📊 <b>የተማሪ ትንታኔ (ገፅ ${pagination.currentPage}/${pagination.totalPages})</b>\n\n`;
    if (data.length === 0) {
      msg += "ተማሪዎች አልተገኙም።";
    } else {
      msg += data
        .map(
          (s, i) =>
            `<b>${i + 1 + (pagination.currentPage - 1) * 5}. ${
              s?.name ?? "N/A"
            }</b>\n` +
            `መለያ: <code>${s?.id}</code>\n` +
            `ስልክ: <code>${s?.phoneNo ?? "N/A"}</code>\n` +
            `ልጅ ነው?: <code>${s?.isKid ? "አዎ" : "አይደለም"}</code>\n` +
            `ፓኬጅ: <code>${s?.activePackage}</code>\n` +
            `እድገት: <code>${s?.studentProgress}</code>\n`
        )
        .join("\n");
    }

    const keyboard = new InlineKeyboard();
    if (pagination.hasPreviousPage)
      keyboard.text(
        "⬅️ ቀዳሚ",
        `ustaz_dashboard_page_${pagination.currentPage - 1}`
      );
    if (pagination.hasNextPage)
      keyboard.text(
        "ቀጣይ ➡️",
        `ustaz_dashboard_page_${pagination.currentPage + 1}`
      );
    keyboard.row().text("🏠 መነሻ", "ustaz_dashboard_home");

    if (ctx.update.callback_query.message) {
      await ctx.editMessageText(msg, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } else {
      await ctx.reply(msg, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    }
  });

  // Home button handler (returns to main menu)
  bot.callbackQuery("ustaz_dashboard_home", async (ctx) => {
    await ctx.answerCallbackQuery();
    const keyboard = new InlineKeyboard()
      .text("📊 ዳሽቦርድ", "ustaz_dashboard_page_1")
      .row()
      .text("✉️ መልእክት ላክ", "ustaz_send");
    await ctx.editMessageText("👋 እንኳን ወደ አድሚን ፓነል በደህና መጡ!", {
      reply_markup: keyboard,
    });
  });

  // bot.start();
  console.log("✅ አድሚን ቦት ተጀምሯል።");
  ////////

  bot.callbackQuery("/package_selection_(.+)/", async (ctx) => {
    await ctx.answerCallbackQuery();
    const keyboard = new InlineKeyboard()
      .text("📊 ዳሽቦርድ", "ustaz_dashboard_page_1")
      .row()
      .text("✉️ መልእክት ላክ", "ustaz_send");
    await ctx.editMessageText("👋 እንኳን ወደ አድሚን ፓነል በደህና መጡ!", {
      reply_markup: keyboard,
    });
  });

  // Schedule a task to run every day at 00:00
  // import { sendProgressMessages } from "./actions/admin/analysis";

  // cron.schedule("28 12 * * *", async () => {
  //   console.log("Running progress notification job...");
  //   console.log("Current time:", new Date().toLocaleString());
  //   console.log("current time zone  >>>", new Date().getTimezoneOffset());
  //   const today = new Date();
  //   const dayOfMonth = today.getDate();

  //   if (dayOfMonth % 3 !== 0) return;
  //   try {
  //     const studentsWithProgress = await sendProgressMessages();

  //     for (const { chatid, progress, studId, name } of studentsWithProgress) {
  //       if (!chatid) continue;

  //       // Delete all previous messages for this user
  //       if (sentMessageIds[chatid]) {
  //         // for (const msgId of sentMessageIds[chatid]) {
  //         //   try {
  //         //     // await bot.api.deleteMessage(Number(chatid), msgId);
  //         //   } catch (err) {
  //         //     // Ignore errors (message might already be deleted)
  //         //   }
  //         // }
  //         sentMessageIds[chatid] = [];
  //       }

  //       let message = "";
  //       let extraOptions = {};

  //       if (progress === "completed") {
  //         message =
  //           "🎉 እንኳን ደስ አለህ! ኮርሱን በትክክል ጨርሰሃል። አመሰግናለሁ!\n\nበትጋትና በትክክል ስራህን በመሟሟት የተማሪነትህን ምርጥ አሳየህ። ይህ የመጀመሪያ አስደሳች እድገት ነው። በሚቀጥለው ደረጃ ደግሞ በትጋት ቀጥለህ እንዲሰራህ እንመኛለን።\n\nአብረንህ እንሰራለን። አዲስ ትምህርቶችን ለመጀመር ዝግጁ እንደሆንህ አሳየኸን። እንኳን አዲስ ደረጃ ላይ በደህና መጡ!";
  //       } else {
  //         message =
  //           progress === "notstarted"
  //             ? "👋 ሰላም፣ ኮርሱን መጀመር አልተጀመርም። እባክህ ዛሬ ጀምር!"
  //             : `⏳ ኮርሱ በመካከለኛ ሁኔታ ነው። ሂደተዎ: ${progress} ነው።እባከዎን ት/ትዎን በርትተው ይጨርሱ።`;

  //         const update = await updatePathProgressData(studId);
  //         if (!update) {
  //           return undefined;
  //         }
  //         const lang = "en";
  //         const stud = "student";
  //         const url = `${BASE_URL}/${lang}/${stud}/${studId}/${update[0]}/${update[1]}`;
  //         const channelName = name || "ዳሩል-ኩብራ";
  //         const keyboard = new InlineKeyboard().webApp(
  //           `📚 የ${channelName}ን የትምህርት ገጽ ይክፈቱ`,
  //           url
  //         );
  //         extraOptions = { reply_markup: keyboard };
  //       }

  //       try {
  //         const sentMsg = await bot.api.sendMessage(
  //           Number(chatid),
  //           message,
  //           extraOptions
  //         );
  //         // Track the new message ID
  //         await Promise.all(
  //           Array(sentMsg.message_id)
  //             .fill({})
  //             .map((v, i) => i)
  //             .reverse()
  //             .map(async (v) => {
  //               try {
  //                 const res = await bot.api.deleteMessage(chatid, v);
  //                 console.log("Deleted message >> ", res, v, chatid);
  //               } catch (error) {
  //                 console.log("Failed to delete message >> ", error);
  //               }
  //               return;
  //             })
  //         );
  //         // if (!sentMessageIds[chatid]) sentMessageIds[chatid] = [];
  //         // sentMessageIds[chatid].push(sentMsg.message_id);
  //         // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //       } catch (err) {
  //         // console.error("Failed to send progress message to", chatid, err);
  //       }
  //     }
  //     // console.log("✅ Progress messages sent to all students.");
  //     // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   } catch (error) {
  //     // console.error("Error in progress notification job:", error);
  //   }
  // });
  // console.log("✅ Daily task scheduled to run at 00:00");
}
