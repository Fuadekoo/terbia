import { Bot } from "grammy";
import { retrieveRawInitData } from "@telegram-apps/sdk";
import prisma from "./lib/db";
import dotenv from "dotenv";

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

export async function startMiniBot() {
  bot.command("start", async (ctx) => {
    const chatId = ctx.chat?.id;

    if (!chatId) {
      return ctx.reply("Unable to retrieve chat ID.");
    }

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
      }?initData=${encodeURIComponent(initDataRaw || "")}`;

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
      console.error("Error in mini bot start command:", error);
      await ctx.reply("❌ አንድ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።");
    }
  });

  bot.catch((err) => {
    console.error("Error in mini bot middleware:", err);
  });

  console.log("Telegram Mini Bot started successfully.");
}
