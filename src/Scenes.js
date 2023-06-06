import { Scenes } from "telegraf";
import { openai } from "./openai.js";

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
}

export default SceneGenerator;
