import { Markup } from "telegraf";

export function getMainMenu() {
  return Markup.keyboard([
    ["Перезагрузить бота"],
    ["Сбросить историю"],
    ["Режим генерации изображений"],
  ]).resize();
}

export function getSecondMenu() {
  return Markup.keyboard([["Покинуть генерацию изображений"]]).resize();
}
