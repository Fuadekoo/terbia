import { retrieveRawInitData } from "@telegram-apps/sdk";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initDataRaw = retrieveRawInitData()
// Parse the raw init data
const urlParams = new URLSearchParams(initDataRaw)
const initDataJson = urlParams.get('user') || urlParams.get('chat') || '{}'

// If you're expecting a chat object (e.g., from a Web App launched in a group)
const chatData = JSON.parse(initDataJson)

// Access the chat ID
const chatId = chatData.id
console.log("chatId", chatId);
  // Student folder is completely public - no authentication required
  // Anyone can access student routes without login
  return <>{children}</>; 
}
