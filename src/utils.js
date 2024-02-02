import { unlink } from "fs/promises";

export async function removeFile(path) {
  try {
    await unlink(path);
  } catch (e) {
    console.log(e.message);
  }
}

export function todayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const hour = today.getHours();
  const minute = today.getMinutes();

  return `${year}-${month < 10 ? "0" : ""}${month}-${day} ${hour}:${minute}`;
}
