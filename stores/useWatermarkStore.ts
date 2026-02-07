import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

const setCookie = (name: string, value: string, days: number = 30) => {
  if (typeof window === "undefined") return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`;
};

const getCookie = (name: string): string | null => {
  if (typeof window === "undefined") return null;
  const nameEq = `${name}=`;
  const parts = document.cookie.split(";");
  for (let i = 0; i < parts.length; i += 1) {
    let cookie = parts[i];
    while (cookie.charAt(0) === " ") cookie = cookie.substring(1, cookie.length);
    if (cookie.indexOf(nameEq) === 0) {
      return decodeURIComponent(cookie.substring(nameEq.length, cookie.length));
    }
  }
  return null;
};

const removeCookie = (name: string) => {
  if (typeof window === "undefined") return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

interface WatermarkUserData {
  username: string | null;
  phoneNumber: string | null;
  fullName: string | null;
  loginTimestamp: string | null;
}

interface WatermarkState {
  userData: WatermarkUserData;
  setUserData: (
    username: string | null,
    phoneNumber: string | null,
    fullName: string | null,
  ) => void;
  clearUserData: () => void;
  getFormattedTimestamp: () => string;
}

export const useWatermarkStore = create<WatermarkState>()(
  devtools(
    persist(
      (set, get) => ({
        userData: {
          username: null,
          phoneNumber: null,
          fullName: null,
          loginTimestamp: null,
        },

        setUserData: (username, phoneNumber, fullName) => {
          const loginTimestamp = new Date().toISOString();
          set({
            userData: {
              username,
              phoneNumber,
              fullName,
              loginTimestamp,
            },
          });

          if (username) setCookie("watermark_username", username, 30);
          if (phoneNumber) setCookie("watermark_phone", phoneNumber, 30);
          if (fullName) setCookie("watermark_fullname", fullName, 30);
          setCookie("watermark_timestamp", loginTimestamp, 30);
        },

        clearUserData: () => {
          set({
            userData: {
              username: null,
              phoneNumber: null,
              fullName: null,
              loginTimestamp: null,
            },
          });

          removeCookie("watermark_username");
          removeCookie("watermark_phone");
          removeCookie("watermark_fullname");
          removeCookie("watermark_timestamp");
        },

        getFormattedTimestamp: () => {
          const { loginTimestamp } = get().userData;
          if (!loginTimestamp) return "";

          try {
            const date = new Date(loginTimestamp);
            return date.toLocaleString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
          } catch {
            return "";
          }
        },
      }),
      {
        name: "watermark-storage",
        storage: {
          getItem: (name: string) => {
            const username = getCookie("watermark_username") || null;
            const phoneNumber = getCookie("watermark_phone") || null;
            const fullName = getCookie("watermark_fullname") || null;
            const loginTimestamp = getCookie("watermark_timestamp") || null;

            if (username || phoneNumber || fullName) {
              return JSON.stringify({
                state: {
                  userData: {
                    username,
                    phoneNumber,
                    fullName,
                    loginTimestamp,
                  },
                },
              });
            }

            try {
              return localStorage.getItem(name);
            } catch {
              return null;
            }
          },
          setItem: (name: string, value: unknown) => {
            try {
              const valueStr =
                typeof value === "string" ? value : JSON.stringify(value);
              const parsed = JSON.parse(valueStr);
              const userData = parsed.state?.userData;

              if (userData) {
                if (userData.username) {
                  setCookie("watermark_username", userData.username, 30);
                }
                if (userData.phoneNumber) {
                  setCookie("watermark_phone", userData.phoneNumber, 30);
                }
                if (userData.fullName) {
                  setCookie("watermark_fullname", userData.fullName, 30);
                }
                if (userData.loginTimestamp) {
                  setCookie("watermark_timestamp", userData.loginTimestamp, 30);
                }
              }

              try {
                localStorage.setItem(name, valueStr);
              } catch {
                // ignore
              }
            } catch (error) {
              console.error("Error saving watermark data:", error);
            }
          },
          removeItem: () => {
            removeCookie("watermark_username");
            removeCookie("watermark_phone");
            removeCookie("watermark_fullname");
            removeCookie("watermark_timestamp");
            try {
              localStorage.removeItem("watermark-storage");
            } catch {
              // ignore
            }
          },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        partialize: (state) => ({
          userData: state.userData,
        }),
      },
    ),
    { name: "WatermarkStore" },
  ),
);
