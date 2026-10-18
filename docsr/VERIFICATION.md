# Verification — 0.7 / 13 October 2026

- JS syntax/Python compilation and standalone build pass.
- Six frontend test files pass, including weather migration/interpolation and action strips.
- Six HTTPS integration scenarios pass on an isolated temporary database/certificate.
- Browser: new menu and city render; first mission completed through terminal commands,
  verified +80 XP and progression to case two. Day preset selectable. No console errors.
- 390×844 world and CRT menu inspected; document width equals viewport width.
- Screenshots and exact scope/visual limitations: [SIGNAL-LOST.md](SIGNAL-LOST.md).
- Reference fidelity is improved but is not pixel-identical; full seven-mode visual
  comparison, remote devices and an unthrottled FPS benchmark are not verified.

---

# Verification — 0.4 / 12 October 2026

- 17 frontend/model tests pass (four test files): prior 15 plus appearance
  migration/validation and independence of identity from purchased clothing.
- Six HTTPS integration scenarios pass, using a temporary trusted certificate
  and database: auth/CSRF, export/validation, 4-player match with authoritative
  scores, one-use private hints, duplicate rejection, reconnect snapshot,
  spectators/deadlines, friends/chat/avatar/search, live event delivery, concurrent
  room capacity checks, save isolation and concurrent write conflict.
- JS syntax and Python compilation pass. The standalone story builds successfully.
- Browser: changed gender, long hair, skin/hair colours; saved, reloaded and verified
  restored selections. Editor inspected on desktop and mobile (~390 px) without
  horizontal overflow. Kept detailed source sprites but restored world footprint
  to 16×24 after the user's correction. City and diner inspected at that size.
- Docker image built after correcting the base image/Pillow combination and
  avoiding a pre-existing system group name. The host rejects runtime execution of both the entrypoint and `/bin/sh` with
  `operation not permitted`. The restart loop was stopped, preserving the volume.
  Container runtime validation remains blocked; protections were not disabled.
- Native HTTPS launcher started; `/api/health` returned `status: ok` with certificate
  verification enabled. The browser rejected the local self-signed certificate
  (`ERR_CERT_AUTHORITY_INVALID`); no warning bypass was attempted.
- Delivered the parcel in the browser after the graphics update and verified
  the 120 XP reward. Git was initialized without inventing author history.

The full authenticated HTTPS club UI, two physical remote devices and independent
latest-Chrome/assistive-technology reviews are not yet verified. The local
self-signed certificate requires the user's/environment's trust setup; no browser
certificate protection was bypassed. 19 points are a candidate module route, not
an awarded score. Real team attribution and Git history remain outstanding.

Screenshots: `character-editor.png`, `city-original-scale.png`.

---

# Проверка выпуска 0.3.0

Дата: 12 октября 2026.

15 автоматических проверок прошли. К десяти проверкам главы добавлены:

- Покупка списывает XP однократно; переодевание бесплатно, общий опыт сохраняется.
- Миграция старых сохранений и восстановление гардероба, истории и интерьера.
- Повторный разговор и перезагрузка не дублируют сюжетную награду.
- Все три входа достижимы из города с реальной коллизией персонажа.
- В каждом интерьере доступны выход, разговор, занятие и предметы; мебель твёрдая.

В браузере проверены меню направлений, правильный ответ во введении OSCP,
путь к магазину, вход, покупка образа «Розовый шум» за 80 XP и восстановление
интерьера, розового персонажа и остатка 920 XP после перезагрузки. Проверены
подбор посылки, возвращение на улицу и вход в закусочную.

Полное ручное прохождение доставки и разговора с Марой, а также новая мобильная
раскладка ещё не проверены: после возобновления сессии браузерный инструмент
блокировал работу с вкладкой после ошибки подключения. Последние изменения
камеры интерьера и пропуск кликов через уведомления проверены по коду,
без повторной визуальной проверки. Снимок магазина: neon-thread-shop.png.

Синтаксис, тесты и автономная сборка проходят. Ниже сохранён протокол предыдущего
выпуска; он не означает повторной браузерной проверки всех сценариев в 0.3.

---

# Проверка выпуска 0.2.0

Дата: 11 октября 2026.

## Автоматические проверки

10 проверок прошли:

1. Последовательное прохождение шести терминальных дел, проверка состояния и
   восстановление промежуточного прогресса из сериализованного сохранения.
2. Неверный DNS, восстановление и повторное внесение неисправности.
3. Слишком широкая блокировка firewall и восстановление сервиса.
4. Сохранение копии, поиск события и фиксация доказательства в правильном порядке.
5. Новая подсеть: изменение шлюза и DNS, повторная проверка после изменений.
6. Ошибочные команды и внешние цели остаются внутри модели.
7. Несовместимая версия сохранений и опасные ключи объектов отклоняются.
8. Локальный шлюз/DNS работают без исправного маршрута по умолчанию; блокировка
   DNS нарушает разрешение имён.
9. Все семь станций и наставник достижимы с реальными размерами коллизии персонажа.
10. Новая архитектура не перекрывает места заданий.

Синтаксис исходных JS-файлов и скомпонованного автономного HTML проверен Node.js.

## Браузерное прохождение

В отдельной тестовой сессии пройдены все семь дел через пользовательский
интерфейс. Проверены отказ DNS, сохранение улик, ошибка при блокировке всего
трафика, восстановление архива, отклонение неподтверждённого отчёта,
завершение главы и скачивание текстового отчёта. После повторения DNS-дела
в песочнице основной прогресс сохранил 7/7 дел и 1000 XP.

Проверено восстановление прогресса после перезагрузки. В консоли не обнаружены
ошибки запуска. На ширине 390 px устранено горизонтальное переполнение;
терминал и повторение задания доступны на мобильной раскладке.

Автономный NULL-CITY.html содержит встроенные CSS и JavaScript, без внешних
скриптов, шрифтов, изображений или сетевых зависимостей. Его запуск проверен
через локальный HTTP-сервер. Открытие по file:// не проверено: браузерный
инструмент запрещает этот протокол.

## Ограничения

Это первая игровая глава, не полный сертификационный маршрут. Реальные
Linux/Windows/AD-лаборатории и дальнейшие главы не реализованы. Проверка
обучения независимыми новичками и экспертная рецензия программы ещё предстоят.


## 1.0 — 2026-10-14

See `RELEASE-1.0.md` for implemented player flows and remaining environment blockers. Main-menu auth switching and the campaign dossier were inspected in the desktop browser. All eight server scenarios and all eight frontend test files pass. The TLS warning prevents claiming a completed multiplayer browser walkthrough.
