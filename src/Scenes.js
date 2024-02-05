import { Scenes, Telegraf } from "telegraf";
import { openai } from "./openai.js";
import User from "./User.js";
import config from "config";

const bot = new Telegraf(config.get("TELEGRAM_TOKEN"));

class SceneGenerator {
  GenImageScene() {
    const imageGenScene = new Scenes.BaseScene("imageGenScene");

    imageGenScene.enter((ctx) =>
      ctx.reply(
        "Я помогу тебе с генерацией изображений. Что ты хочешь увидеть?"
      )
    );

    imageGenScene.command("leave", async (ctx) => {
      await ctx.scene.leave();
    });

    imageGenScene.on("text", async (ctx) => {
      try {
        const { message_id } = await ctx.reply("Выолнение запроса...");
        let prompt = await ctx.message.text;
        const res = await openai.ImageGenerate(prompt);
        if (res === undefined) {
          ctx.reply("Ошибка, попробуй ввести запрос заново");
        } else {
          await ctx.replyWithPhoto(res.data[0].url, "image.jpg");
        }
        await ctx.telegram.deleteMessage(ctx.chat.id, message_id);
        await ctx.reply(
          "Если хочешь выйти из генерации изображения используй /leave"
        );
      } catch (e) {
        await ctx.reply("Произошла ошибка, перезагрузите бота командой /start");
        console.log(e.message);
      }
    });

    imageGenScene.leave((ctx) => {
      ctx.reply(
        "Вы покинули генерацию изображений. Можете продолжить свой диалог"
      );
    });

    return imageGenScene;
  }

  GenSendAllScene() {
    const sendAllScene = new Scenes.BaseScene("sendAllScene");

    sendAllScene.enter(
      async (ctx) =>
        await ctx.reply("Введите сообщение которое хотите всем отправить: ")
    );

    sendAllScene.on("message", async (ctx) => {
      try {
        const users = await User.find({});

        let msg = "";
        let photoPath = "";

        if (ctx.message.text) {
          msg = ctx.message.text;
        } else {
          photoPath = await ctx.message.photo[0];
        }

        await users.forEach(async (user, i) => {
          setTimeout(async () => {
            if (ctx.message.text) {
              try {
                await bot.telegram.sendMessage(user.chatId, msg);
              } catch (e) {
                console.log("BOT WAS BLOCKED");
              }
            } else {
              try {
                msg = ctx.message.caption || "";

                await bot.telegram.sendPhoto(user.chatId, photoPath.file_id, {
                  caption: msg,
                });
              } catch (e) {
                console.log("BOT WAS BLOCKED");
              }
            }
          }, 100 * ++i);
        });
        ctx.scene.leave();
      } catch (e) {
        console.log(e);
      }
    });

    return sendAllScene;
  }
}

export default SceneGenerator;
