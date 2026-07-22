import prisma from "@/lib/db"; // Adjust path if needed
// import axios from "axios";
import { Bot } from "grammy";

// const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || "");

// async function sendTelegramMessage(chatId: string, text: string) {
//     try {
//       await bot.api.sendMessage(chatId, text);
//     } catch (err) {
//       console.error("Failed to send initial message:", err);
//     }
// //   const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
// //   await axios.post(url, {
// //     chat_id: chatId,
// //     text,
// //   });
// }

export async function sendMessagesToAllStudents() {
  const students = await prisma.wpos_wpdatatable_23.findMany({
    where: {
      chat_id: { not: null },
      status: { in: ["Active", "Not yet", "On progress", "terbia"] },
      progress: {  }, // Ensure no progress exists
      activePackage: {
        isPublished: true,
        courses: {
          some: {
            isPublished: true,
            chapters: {
              some: {
                isPublished: true,
              },
            },
          },
        },
      },
    },
    select: { chat_id: true, wdt_ID: true, name: true, activePackage: { select: { name: true } } },
  });

  for (const student of students) {
    const studentProgress = await prisma.studentProgress.findFirst({
      where: {
        studentId: student.wdt_ID,
      },
    });
    if (student.chat_id && !studentProgress) {
      try {
              await bot.api.sendMessage(
                student.chat_id,
                `ውድ ተማሪያችን ${student.name} የ${student.activePackage?.name} ፓኪጅ እንዲወስዱ ተፈቅዶለዎታል፡፡ እባኮት ት/ቱን ይጀምሩ፡፡`
              );

        // await sendTelegramMessage(
        //   student.chat_id,
        //   `ውድ ተማሪያችን ${student.name} የ${student.activePackage?.name} ፓኪጅ እንዲወስዱ ተፈቅዶለዎታል፡፡ እባኮት ት/ቱን ይጀምሩ፡፡`
        // );
      } catch (error) {
        console.error(`Failed to send message to ${student.chat_id}:`, error);
      }
    }
  }
}

// Send every minute
setInterval(sendMessagesToAllStudents, 60 * 1000);

// Optionally, send immediately on start
// sendMessagesToAllStudents();
