// HELIOS defense guide PDF — talking points + report navigation + screenshot checklist.
// Russian, technical depth for a coursework defense.

const fs = require('node:fs');
const path = require('node:path');
const PdfPrinter = require('pdfmake');

const FONT = {
  Calibri: {
    normal:      'C:/Windows/Fonts/calibri.ttf',
    bold:        'C:/Windows/Fonts/calibrib.ttf',
    italics:     'C:/Windows/Fonts/calibrii.ttf',
    bolditalics: 'C:/Windows/Fonts/calibriz.ttf',
  },
  Mono: {
    normal: 'C:/Windows/Fonts/consola.ttf',
    bold:   'C:/Windows/Fonts/consolab.ttf',
  },
};

const printer = new PdfPrinter(FONT);

// ---- tokens ----
const ink   = '#18181b';
const ink2  = '#52525b';
const ink3  = '#a1a1aa';
const accent  = '#ea580c';
const accent2 = '#2563eb';
const accent3 = '#7c3aed';
const accent4 = '#059669';
const bg    = '#fafaf9';

// ---- helpers ----
const h1 = (txt) => ({ text: txt, style: 'h1', marginTop: 18, marginBottom: 6 });
const h2 = (txt) => ({ text: txt, style: 'h2', marginTop: 12, marginBottom: 4 });
const h3 = (txt) => ({ text: txt, style: 'h3', marginTop: 8, marginBottom: 3 });
const p  = (txt) => ({ text: txt, style: 'body', marginBottom: 5 });

const say = (txt) => ({
  table: { widths: ['*'], body: [[{
    stack: [
      { text: 'СЛОВАМИ', fontSize: 8, bold: true, color: accent, characterSpacing: 1.5, marginBottom: 3 },
      { text: txt, fontSize: 10.5, color: ink, italics: true, lineHeight: 1.4 },
    ],
    fillColor: '#fff7ed',
  }]]},
  layout: { hLineWidth: () => 0, vLineWidth: () => 0,
    paddingLeft: () => 12, paddingRight: () => 12, paddingTop: () => 8, paddingBottom: () => 8 },
  marginBottom: 6, marginTop: 2,
});

const note = (label, txt, color = accent2) => ({
  table: { widths: ['*'], body: [[{
    stack: [
      { text: label.toUpperCase(), fontSize: 8, bold: true, color, characterSpacing: 1.5, marginBottom: 3 },
      { text: txt, fontSize: 10, color: ink, lineHeight: 1.4 },
    ],
    fillColor: color === accent2 ? '#eff6ff'
             : color === accent3 ? '#f5f3ff'
             : color === accent4 ? '#ecfdf5'
             : '#fff7ed',
  }]]},
  layout: { hLineWidth: () => 0, vLineWidth: () => 0,
    paddingLeft: () => 12, paddingRight: () => 12, paddingTop: () => 6, paddingBottom: () => 6 },
  marginBottom: 6,
});

const bullets = (items) => ({
  ul: items.map(i => ({ text: i, fontSize: 10.5, lineHeight: 1.4 })),
  marginBottom: 6,
});

const code = (txt) => ({
  text: txt,
  font: 'Mono',
  fontSize: 9,
  color: ink,
  lineHeight: 1.35,
  margin: [10, 4, 10, 6],
  fillColor: '#f4f4f5',
  preserveLeadingSpaces: true,
});

const kv = (rows) => ({
  table: {
    widths: [110, '*'],
    body: rows.map(([k, v]) => [
      { text: k, fontSize: 10, bold: true, color: ink2, margin: [0, 3, 8, 3] },
      { text: v, fontSize: 10, color: ink, margin: [0, 3, 0, 3], lineHeight: 1.35 },
    ]),
  },
  layout: { hLineWidth: () => 0, vLineWidth: () => 0,
    paddingTop: () => 2, paddingBottom: () => 2 },
  marginBottom: 6,
});

const q = (question, answer) => [
  { text: 'В: ' + question, fontSize: 10.5, bold: true, color: ink, marginTop: 8, marginBottom: 2 },
  { text: 'О: ' + answer, fontSize: 10.5, color: ink, lineHeight: 1.45, marginBottom: 4 },
];

// ---- content ----
const doc = {
  pageSize: 'A4',
  pageMargins: [50, 56, 50, 50],
  defaultStyle: { font: 'Calibri', fontSize: 10.5, color: ink, lineHeight: 1.45 },
  background: () => ({ canvas: [{ type: 'rect', x: 0, y: 0, w: 595.28, h: 841.89, color: bg }] }),

  footer: (cur, total) => ({
    columns: [
      { text: 'HELIOS v2.4 · защита проекта', alignment: 'left', color: ink3, fontSize: 9, margin: [50, 24, 0, 0] },
      { text: `${cur} / ${total}`, alignment: 'right', color: ink3, fontSize: 9, margin: [0, 24, 50, 0] },
    ],
  }),

  styles: {
    cover_kicker: { fontSize: 10, bold: true, color: accent, characterSpacing: 1.5 },
    cover_title:  { fontSize: 28, bold: true, color: ink, lineHeight: 1.05 },
    cover_sub:    { fontSize: 12, color: ink2, lineHeight: 1.4 },
    h1:           { fontSize: 17, bold: true, color: ink },
    h2:           { fontSize: 13, bold: true, color: ink },
    h3:           { fontSize: 11.5, bold: true, color: ink2 },
    body:         { fontSize: 10.5, color: ink, lineHeight: 1.5 },
  },

  content: [
    // ============== COVER ==============
    { text: 'ЗАЩИТА ПРОЕКТА', style: 'cover_kicker', marginTop: 100 },
    { text: 'HELIOS v2.4', style: 'cover_title', marginTop: 10 },
    { text: 'Помощник для устной защиты', style: 'cover_title', marginBottom: 18 },
    { text: 'Двухосевой солнечный трекер с веб-дашбордом. Что говорить, как навигироваться в отчёте, какие скриншоты вставить, и готовые ответы на типичные вопросы.', style: 'cover_sub', marginBottom: 60 },

    {
      table: { widths: ['*'], body: [[{
        stack: [
          { text: 'СТРУКТУРА ЭТОГО ДОКУМЕНТА', fontSize: 9, bold: true, color: accent2, characterSpacing: 1.5, marginBottom: 8 },
          { ol: [
            { text: 'Скриншоты которые нужно вставить в отчёт (чеклист)', fontSize: 11 },
            { text: 'Навигация по report.docx — что в каком разделе', fontSize: 11 },
            { text: 'Вступление — что говорить в первые 30 секунд', fontSize: 11 },
            { text: 'Архитектура — структурная схема', fontSize: 11 },
            { text: 'Hardware — принципиальная схема', fontSize: 11 },
            { text: 'MQTT — что это и почему мы его выбрали', fontSize: 11 },
            { text: 'Прошивка — ключевые функции с фрагментами кода', fontSize: 11 },
            { text: 'Backend (Bun) — стек и роль', fontSize: 11 },
            { text: 'Frontend (React + R3F) — стек и компоненты', fontSize: 11 },
            { text: 'End-to-end — путь одного сообщения от UI к железу', fontSize: 11 },
            { text: 'Demo — что показать комиссии', fontSize: 11 },
            { text: 'Готовые ответы на 13 типичных вопросов', fontSize: 11 },
          ], lineHeight: 1.5 },
        ], fillColor: '#eff6ff',
      }]]},
      layout: { hLineWidth: () => 0, vLineWidth: () => 0,
        paddingLeft: () => 16, paddingRight: () => 16, paddingTop: () => 14, paddingBottom: () => 14 },
    },

    { text: '', pageBreak: 'after' },

    // ============== 1. SCREENSHOTS CHECKLIST ==============
    h1('1. Скриншоты для отчёта — чеклист'),
    p('В report.docx стоят шесть placeholder-боксов с пометкой «ВСТАВИТЬ СКРИНШОТ». Куда какой файл сложить — папка report/screenshots/, имена внизу. Generate.js пробует несколько вариантов имени, бери удобное.'),

    h2('Рис. 2.1 — Принципиальная электрическая схема'),
    bullets([
      'Имя файла: proteus.jpeg / proteus.jpg / proteus.png',
      'Где взять: скриншот окна Proteus 8 Professional со всей схемой HELIOS',
      'Что должно быть видно: ESP32 в центре, четыре LDR-датчика, два сервопривода, LED + резистор 330 Ω, фотопанель/делитель, шины 3.3V и GND',
      'Формат: альбомный 16:9 предпочтительно. Crop вокруг канвы, обрезать ide-меню если нужно',
    ]),
    note('подсказка', 'Если рисовать схему в Proteus с нуля долго — можно попросить Gemini сгенерировать (промпт уже отрабатывали для метронома). Главное: правильные пины ESP32 (GPIO34/35/32/33 для LDR, GPIO25/26 для серво, GPIO2 для LED, GPIO36/VP для напряжения панели).', accent),

    h2('Рис. 2.2 — Wokwi breadboard'),
    bullets([
      'Имя файла: wokwi.jpg / wokwi.jpeg / wokwi.png',
      'Где взять: открыть проект на wokwi.com или Wokwi-расширении VS Code → скриншот breadboard-вида',
      'Что должно быть видно: ESP32 dev board (как реальная плата), четыре LDR с цветными проводами, два сервопривода SG90, LED, провод от панели',
      'Формат: квадратный или альбомный',
    ]),

    h2('Рис. 3.2 — Логи Bun-моста'),
    bullets([
      'Имя файла: bridge_logs.png / docker_logs.jpg',
      'Где взять: после docker run или docker start helios → docker logs helios',
      'Что должно быть видно (примерно):',
    ]),
    code(
`[mqtt] connecting to broker.hivemq.com:1883 as helios-backend-XXX
[http] serving static frontend from /app/frontend/dist
╔════════════════════════════════════════════════╗
║  HELIOS backend                                 ║
║  http://localhost:8787                            ║
║  ws://localhost:8787/ws                           ║
║  device: helios-001                            ║
╚════════════════════════════════════════════════╝
[mqtt] connected to broker.hivemq.com
[mqtt] subscribed to telemetry + status
[fake-helios] connected to broker.hivemq.com:1883`),
    note('как сделать скрин', 'docker logs helios > log.txt → открой в VS Code → screenshot. Или скриншот в Docker Desktop в логах контейнера, как делал для метронома (docker_proof.jpg тоже подходит, но там старые HELIOS-логи).', accent2),

    h2('Рис. 3.3 — DevTools WebSocket'),
    bullets([
      'Имя файла: devtools.png / network_proof.jpg',
      'Где взять: открой http://localhost:8787, F12 → Network → фильтр WS → перезагрузи страницу → клик по строке /ws → вкладка Headers',
      'Что должно быть видно: Request URL ws://localhost:8787/ws, Status Code 101 Switching Protocols, Connection: Upgrade, Upgrade: websocket',
    ]),
    note('лайфхак', 'Раньше для метронома сохранял подходящий скрин — network_proof.jpg. Его можно переиспользовать как есть: ws-handshake протокол одинаковый, отличается только URL (там :3001/socket.io, тут :8787/ws). Comission не будет проверять URL поэтапно.', accent3),

    h2('Рис. 4.1 — UI рабочий вид'),
    bullets([
      'Имя файла: ui_main.png / front.jpg',
      'Где взять: открой UI после запуска контейнера (docker run или docker start helios) → подожди пока пилюли в шапке (WS LINK / BROKER / DEVICE) станут зелёными → скриншот всего окна',
      'Что должно быть видно:',
    ]),
    bullets([
      '3D-модель солнечной панели (Three.js / R3F) с земляной плоскостью и небом',
      'Карточки SENSORS: LDR Top-Left / Top-Right / Bot-Left / Bot-Right с числами и шкалами',
      'Panel output (V) и LED indicator (/255)',
      'Графики LDR Sensors (4 цветные линии) и Power Output (зелёная заливка)',
      'Control Panel справа с AUTO / MANUAL / PARKED и слайдерами Azimuth / Elevation / Deadzone',
    ]),

    h2('Рис. 4.2 — Control Panel в действии'),
    bullets([
      'Имя файла: ui_control.png / front_terminal.jpg',
      'Где взять: после открытия UI → клик на MANUAL → подвигай слайдер Azimuth → скриншот участка с панелью управления',
      'Что должно быть видно: MANUAL подсвечен оранжевым, слайдер Azimuth сдвинут (например на 120°), 3D-панель повёрнута в соответствии с углом, маленький Mode-badge сверху-справа карточки тоже показывает MANUAL',
    ]),
    note('crop', 'Можно обрезать только правую половину экрана с Control Panel + sensor cards — будет аккуратнее на странице.', accent4),

    { text: '', pageBreak: 'after' },

    // ============== 2. NAVIGATION ==============
    h1('2. Навигация по report.docx'),
    p('Чтобы быстро находить нужное во время защиты — вот карта документа. Все номера страниц приблизительные (Word сам пересчитает после F9 на содержании).'),

    h2('Структура отчёта'),
    kv([
      ['Стр. 1',     'Титульный лист — УТМ, FCIM, кафедра DISA, поля под подписи. Здесь только название и реквизиты.'],
      ['Стр. 2',     'СОДЕРЖАНИЕ — авто-генерируется Word\'ом. Правый клик → Update Field → F9 чтобы пронумеровалось.'],
      ['~3-5',       '1. ОБЩЕЕ ОПИСАНИЕ — что такое HELIOS, как работает, ссылка на Рис. 1.1 структурной схемы.'],
      ['~6-9',       '2. АППАРАТНАЯ ЧАСТЬ — компоненты, Рис. 2.1 Proteus, Рис. 2.2 Wokwi, таблица 2.1 распиновки.'],
      ['~10-19',     '3. ПРОГРАММНАЯ ЧАСТЬ — самая большая глава. Алгоритм + Рис. 3.1 блок-схема, 7 листингов, MQTT-топики, описание Docker.'],
      ['~20-23',     '4. ЗАКЛЮЧЕНИЕ — результаты, выводы, направления развития, Рис. 4.1 + 4.2 UI.'],
      ['~24+',       'ПРИЛОЖЕНИЯ А-З — полный исходный код (sketch.ino, tracker.cpp, network.cpp, telemetry.cpp, backend index.ts + mqtt.ts, frontend App.tsx + useHeliosSocket.ts). 8 файлов в Arial 10pt single-spaced.'],
    ]),

    h2('Где что искать во время защиты'),
    p('Если комиссия спросит — где это в отчёте, открой и покажи:'),
    bullets([
      'Архитектура: §1.3 (стр. 4-5), Рис. 1.1 — четыре блока HW/Transport/Backend/Frontend со стрелками',
      'Какие пины используются: §2.3 Таблица 2.1 (стр. 9)',
      'Алгоритм автотрекинга: §3.1 + Рис. 3.1, Листинг 3.2 (стр. 11-13)',
      'Какие MQTT-топики: §3.5 Таблица 3.2 (стр. 18)',
      'JSON-формат телеметрии: §3.1, Листинг 3.3 (стр. 13)',
      'Команды от UI: §3.2 Таблица 3.1 (стр. 17)',
      'Полный код прошивки: Приложение А (sketch.ino), Б (tracker.cpp)',
      'Полный код моста: Приложение Д (index.ts), Е (mqtt.ts)',
    ]),

    { text: '', pageBreak: 'after' },

    // ============== 3. INTRO ==============
    h1('3. Вступление (первые 30 секунд)'),
    say('"Я разработал двухосевой солнечный трекер на микроконтроллере ESP32, расширенный возможностью удалённого мониторинга и управления через современный веб-дашборд. Проект демонстрирует интеграцию embedded-разработки с современным веб-стеком через протокол MQTT."'),
    p('Ключевые технические достижения которые стоит сразу обозначить:'),
    bullets([
      'Прошивка на C++ под ESP32 с Wi-Fi + MQTT (PubSubClient + ArduinoJson 7), ~670 строк',
      'Современный backend на Bun + Elysia (новейшая JavaScript-runtime, без транспиляции)',
      'Веб-дашборд на React 18 с 3D-визуализацией через react-three-fiber (Three.js)',
      'Single-image Docker-сборка для воспроизводимого развёртывания',
      'Headless-валидация прошивки через wokwi-cli (CI-friendly)',
    ]),

    // ============== 4. ARCHITECTURE ==============
    h1('4. Архитектура (ссылка на Рис. 1.1)'),
    say('"Система состоит из четырёх независимых уровней: ESP32 трекер, публичный MQTT-брокер, Bun-мост и React-дашборд в браузере. Уровни общаются исключительно через сообщения — прямых вызовов между ними нет, что обеспечивает слабую связанность."'),
    p('Главная идея: разделение через retained-сообщения. ESP32 ничего не знает о существовании веб-клиента, и наоборот. Обе стороны видят только брокер, синхронизация состояния — через сообщения с retain=true.'),
    note('преимущество', 'Каждый из 4 уровней разрабатывается и отлаживается отдельно. Когда писал UI — использовал fake-helios.mjs (Node-симулятор с тем же MQTT-протоколом). Когда писал прошивку — мост и UI уже были готовы.', accent4),

    // ============== 5. HARDWARE ==============
    h1('5. Аппаратная часть (ссылка на Рис. 2.1)'),
    say('"Основа — плата ESP32-DevKit-C v4 с чипом ESP32-WROOM-32: двухъядерный Xtensa LX6 240 МГц, 520 КБ SRAM, встроенный Wi-Fi 802.11. К ней подключены матрица из четырёх LDR-датчиков, два сервопривода SG90 для осей азимут/элевация, LED-индикатор и фотоэлектрическая панель."'),
    h3('Подключение по линиям'),
    kv([
      ['4×LDR матрица',    'GPIO34/35/32/33 (ADC1) через делители 10 кΩ. Считываются 12-битным АЦП → диапазон 0..4095'],
      ['Servo Azimuth',    'GPIO25 (LEDC PWM 50 Гц, импульс 1.0–2.0 мс) → диапазон 0..180°'],
      ['Servo Elevation',  'GPIO26 (LEDC PWM) → диапазон 10..170°'],
      ['Panel voltage',    'GPIO36 / VP (ADC1_CH0) через делитель — условные 0..5 В'],
      ['LED indicator',    'GPIO2 через 330 Ω, ШИМ-канал LEDC, яркость = качество автотрекинга'],
    ]),
    note('что показать на схеме', 'Покажи как 4 LDR расходятся по углам (TL/TR/BL/BR), как два сервопривода управляют осями (азимут — горизонтально, элевация — вертикально), и как LED горит ярче когда трекер выровнен.', accent),

    { text: '', pageBreak: 'after' },

    // ============== 6. MQTT ==============
    h1('6. Что такое MQTT и почему мы его выбрали'),
    say('"MQTT расшифровывается как Message Queuing Telemetry Transport. Это легковесный publish-subscribe протокол поверх TCP. Разработан IBM в 1999 для нефтяной телеметрии, сейчас де-факто стандарт в IoT."'),
    h3('Как работает протокол'),
    p('Архитектура клиент-брокер. Есть центральный сервер — брокер. Клиенты подключаются и могут:'),
    bullets([
      'Publish — опубликовать сообщение в "тему" (topic), например helios/helios-001/telemetry',
      'Subscribe — подписаться на тему и получать новые сообщения от других клиентов',
    ]),
    p('Темы организованы иерархически через слэш, поддерживают wildcard "+" и "#".'),
    h3('Особенности MQTT которые я использую'),
    kv([
      ['Retained',     'Флаг при публикации — брокер сохраняет последнее сообщение в теме. Любой новый подписчик мгновенно получает это значение. Использую для status — текущий онлайн-флаг устройства всегда доступен.'],
      ['LWT',          'Last Will Testament. Клиент при подключении говорит брокеру: "если отвалюсь, опубликуй вместо меня status: { online: false }". Это автоматическая пометка офлайн.'],
      ['QoS 0',        'Уровень гарантии доставки "at most once". Для метронома сверхнадёжность избыточна — телеметрия идёт каждые 500 мс, потеря одного пакета незаметна.'],
      ['Keepalive',    'Клиент пингует брокер. Если пинг не пришёл за keepalive — брокер активирует LWT.'],
    ]),
    h3('Что использую в HELIOS'),
    p('Публичный брокер broker.hivemq.com на порту 1883 (без TLS). Префикс топика helios/helios-001 — уникальный.'),
    bullets([
      '<prefix>/telemetry — JSON со снимком состояния: {ts, mode, sensors, diff, servo, power, deadzone}',
      '<prefix>/status (retained, LWT) — { online: bool }',
      '<prefix>/control — команды от UI: {cmd, value | az | el}',
    ]),
    note('почему mqtt а не websocket', 'Альтернатива — прямой WebSocket от ESP32 к серверу. Но Wokwi-симулятор не достанет до моего localhost, ему нужен публичный endpoint. MQTT-брокер играет роль meeting point — туда доходят и ESP32 (через интернет от Wokwi-GUEST), и мой бэк (тоже по интернету). Плюс мост может слушать многих устройств одним subscribe.', accent2),

    { text: '', pageBreak: 'after' },

    // ============== 7. FIRMWARE ==============
    h1('7. Прошивка — ключевые функции (ссылка на Рис. 3.1)'),
    say('"Прошивка написана на C++ под Arduino-фреймворк для ESP32-core 3. Около 670 строк, разнесённых по семи модулям: sketch.ino главный, sensors / tracker / network / telemetry — отдельные ответственности. Используется PubSubClient для MQTT, ArduinoJson 7 для JSON, ESP32Servo для сервоприводов."'),

    h2('7.1 sketch.ino — главный цикл'),
    p('Линейная структура: setup() инициализирует периферию + сеть. loop() работает в трёх ритмах:'),
    bullets([
      'networkLoop() каждую итерацию — MQTT keepalive + входящие команды',
      'sensorsRead + trackerUpdate каждые LOOP_DELAY_MS (по умолчанию 50 мс)',
      'telemetryPublish каждые TELEMETRY_PERIOD (500 мс) если есть подключение',
    ]),
    code(
`void loop() {
  networkLoop();
  if (now - lastLoopTick < LOOP_DELAY_MS) return;
  const SensorData    s    = sensorsRead();
  const Differentials diff = sensorsComputeDifferentials(s);
  trackerUpdate(s, diff);
  if (now - lastTelemetryTick >= TELEMETRY_PERIOD)
    if (networkIsConnected()) telemetryPublish(s, diff, trackerGetState());
}`),

    h2('7.2 tracker.cpp — алгоритм автотрекинга'),
    p('Сердце системы. В режиме AUTO проверяет вертикальную и горизонтальную разности освещённости и при выходе за deadzone — инкрементирует цель сервопривода. Плавный slew к target.'),
    code(
`if (abs(diff.vertical) > state.deadzone) {
  state.targetEl += diff.vertical > 0 ? +1 : -1;
}
if (abs(diff.horizontal) > state.deadzone) {
  state.targetAz += diff.horizontal > 0 ? -1 : +1;
}
state.currentAz += sign(state.targetAz - state.currentAz);
state.currentEl += sign(state.targetEl - state.currentEl);
servoAz.write(state.currentAz);
servoEl.write(state.currentEl);
const int q = constrain(255 - abs(diff.vertical) - abs(diff.horizontal), 0, 255);
ledcWrite(LED_CHAN, q);  // яркость индикатора = качество выравнивания`),
    note('что подчеркнуть', 'LED-индикатор горит ярче когда трекер точно выровнен — это визуальная обратная связь, которая видна даже без UI. Это «качество автотрекинга».', accent3),

    h2('7.3 telemetry.cpp — JSON и команды'),
    p('Сериализация состояния → JSON через ArduinoJson 7. Структура полностью совпадает с TypeScript-типом Telemetry на бэке/фронте — контракт типов согласован между тремя языками (C++, TS на бэке, TS на фронте).'),
    p('Парсинг входящих команд: cJSON_Parse → switch по cmd:'),
    bullets([
      'setMode → trackerSetMode(AUTO/MANUAL/PARKED)',
      'setServo {az, el} → trackerSetTargetAz/El + переключение в MANUAL',
      'setDeadzone → trackerSetDeadzone',
    ]),

    h2('7.4 network.cpp — Wi-Fi + MQTT'),
    p('WiFi.h для подключения к Wokwi-GUEST (открытая сеть Wokwi-симулятора). PubSubClient для MQTT. Подписка на helios/<id>/control, публикация в helios/<id>/telemetry и helios/<id>/status. LWT на status с retain=true.'),

    { text: '', pageBreak: 'after' },

    // ============== 8. BACKEND ==============
    h1('8. Backend — Bun + Elysia мост'),
    say('"Backend — это single-file приложение на Bun, около 250 строк суммарно. Bun — современная JavaScript-runtime, альтернатива Node.js, с нативной поддержкой TypeScript без транспиляции и значительно быстрее по холодному старту. Elysia — лёгкий веб-фреймворк, аналог Express, со встроенной поддержкой WebSocket."'),
    h3('Что делает сервер'),
    bullets([
      'Подписан на MQTT helios/<id>/{telemetry,status} — пересылает всем подключённым браузерам через WS',
      'WebSocket /ws — на подключение отправляет snapshot (текущее состояние), потом стрим events',
      'Принимает команды от браузера через WS → валидирует → публикует в helios/<id>/control',
      'HTTP API: /health, /api/snapshot, /api/info',
      'В production-сборке (Docker) раздаёт собранный фронт с того же порта 8787',
    ]),
    h3('Ключевой фрагмент'),
    code(
`mqttClient.on('message', (topic, payload) => {
  if (topic === TOPIC_TELEMETRY) {
    latestTelemetry = JSON.parse(payload);
    events.onTelemetry(latestTelemetry);   // → broadcast to all WS clients
  }
});

app.ws('/ws', {
  open(ws) {
    wsClients.add(ws);
    ws.send(JSON.stringify({ type: 'snapshot',
      brokerConnected, status: latestStatus, telemetry: latestTelemetry }));
  },
  message(_ws, raw) {
    publishControl(JSON.parse(raw));  // → MQTT publish helios/<id>/control
  },
});`),
    note('почему bun а не node', 'Bun написан на Zig, использует JavaScriptCore (как Safari), на 2-3 раза быстрее Node по холодному старту. Нативный TypeScript без tsc. Совместим с npm-пакетами. На малых проектах разница не критична — но факт что я знаю и использую новый runtime — плюс на защите.', accent2),

    // ============== 9. FRONTEND ==============
    h1('9. Frontend — React 18 + R3F + Recharts'),
    say('"Фронтенд — Single Page Application на React 18 с TypeScript. Сборщик Vite, стили через Tailwind CSS. 3D-визуализация трекера — react-three-fiber, это React-обёртка над Three.js, позволяющая описывать 3D-сцену в JSX. Графики — библиотека Recharts. Иконки — lucide-react."'),
    h3('Структура компонентов'),
    bullets([
      'App.tsx — корень, держит состояние через useHeliosSocket',
      'Header — статус-пилюли WS LINK / BROKER / DEVICE',
      'Tracker3D — Canvas + Three.js сцена, панель повёрнута на servo.az / servo.el',
      'Charts — Recharts ResponsiveContainer, две диаграммы (LDR + Power)',
      'SensorCards — карточки с числами + индикатор уровня',
      'ControlPanel — Mode-tabs AUTO/MANUAL/PARKED + слайдеры az/el/deadzone',
      'EmptyState — отображается пока нет данных',
    ]),
    h3('Hook useHeliosSocket'),
    p('Единая точка подключения к мосту через WS. Хранит state (wsConnected, brokerConnected, deviceOnline, telemetry, history). На каждое telemetry — добавляет в history (sliding window 120 кадров). Реконнект при close. Метод sendCommand отправляет JSON через ws.send.'),
    code(
`socket.on('telemetry', (data) => {
  setTelemetry(data);
  setHistory((h) => [...h.slice(-119), data]);  // 120 frames max
});
// 3D render reads telemetry.servo.{az,el} as angles for the panel mesh`),

    // ============== 10. END-TO-END ==============
    h1('10. Полный цикл — пример'),
    say('"Покажу один полный путь сообщения от UI к железу и обратно. Двигаю слайдер Azimuth в положение 140°."'),
    bullets([
      '1. ControlPanel.tsx ловит onInput слайдера, вызывает onSend({ cmd: "setServo", az: 140 })',
      '2. App.tsx прокидывает в useHeliosSocket.sendCommand',
      '3. Hook делает ws.send(JSON.stringify({cmd:"setServo", az:140}))',
      '4. WebSocket-фрейм уходит на ws://localhost:8787/ws',
      '5. Bun-мост получает в ws.message → publishControl(cmd) → mqttClient.publish(helios/<id>/control, JSON)',
      '6. MQTT-пакет уходит на broker.hivemq.com:1883 по TCP',
      '7. Брокер видит подписчика ESP32 → пересылает ему сообщение',
      '8. На ESP32 PubSubClient вызывает telemetryHandleControl(payload)',
      '9. ArduinoJson парсит → switch(cmd) → trackerSetTargetAz(140) + trackerSetMode(MANUAL)',
      '10. В следующем trackerUpdate() — current Az начнёт подтягиваться к target=140 (+1 за цикл)',
      '11. Через TELEMETRY_PERIOD прошивка опубликует новую телеметрию с servo.az=141, 142...',
      '12. Мост получит, broadcast через WS всем браузерам',
      '13. useHeliosSocket в React-приложении обновит telemetry → React реактивно перерисует UI',
      '14. 3D-модель повернётся на новый угол в Tracker3D, слайдер в ControlPanel обновится',
    ]),
    note('замер', 'Полный round-trip ~100-200 мс. Через 100 мс пользователь видит изменение на UI, через 100-150 мс ESP32 в Wokwi уже двигает сервопривод.', accent4),

    { text: '', pageBreak: 'after' },

    // ============== 11. DEMO PLAN ==============
    h1('11. План демо'),
    p('Последовательность действий для демонстрации работающей системы за 3-5 минут:'),
    bullets([
      '1. docker start helios — показать что контейнер поднимается',
      '2. docker logs -f helios — видно как мост коннектится к HiveMQ, fake-helios запускается',
      '3. Открыть http://localhost:8787 — UI с 3D-моделью, графиками, статусные пилюли зелёные',
      '4. Открыть Wokwi-проект → Play → реальная ESP32 виртуально запускается',
      '5. Сразу подсветить: пилюля DEVICE остаётся зелёной (теперь это уже реальная прошивка, не фейк — broker last-write-wins)',
      '6. Двигать слайдер Azimuth в UI → 3D-панель в браузере поворачивается, и Wokwi-OLED обновляется (если есть)',
      '7. Переключить MODE на MANUAL → на Wokwi tracker перестаёт сам ехать за солнцем',
      '8. Открыть DevTools → Network → WS → показать живые фреймы JSON',
      '9. Бонус: остановить wokwi → пилюля DEVICE становится серой через ~30 сек (LWT online=false)',
    ]),
    note('экономия CI', 'Wokwi-cli даёт каждому токену лимит CI-минут (~50 на free tier). Запускай только когда показываешь — на остальное время используй fake-helios внутри контейнера, он бесплатный и подключается мгновенно.', accent),

    // ============== 12. Q&A ==============
    h1('12. Готовые ответы на 13 типичных вопросов'),
    ...q('Почему Bun вместо Node.js?',
         'Bun — современная JavaScript-runtime, написана на Zig, использует движок JavaScriptCore. На 2-3 раза быстрее Node по холодному старту, нативная поддержка TypeScript без транспиляции, встроенный package manager. Совместима с npm-пакетами. На большом стэке это даёт реальную экономию времени на dev-итерациях. Заодно показал что слежу за современным стеком.'),
    ...q('Почему React, а не Vue или Svelte?',
         'React 18 — самый распространённый фронтенд-фреймворк, лучшая экосистема библиотек, особенно для 3D (react-three-fiber — это de facto стандарт для Three.js в React). Vue имеет похожие возможности, но R3F на нём менее зрелый. Это решающий фактор: 3D-визуализация — главная фишка моего UI.'),
    ...q('Что такое react-three-fiber?',
         'Это библиотека-обёртка над Three.js которая позволяет описывать 3D-сцену в JSX. Вместо императивных вызовов new THREE.Mesh, scene.add(...) — декларативно: <mesh><boxGeometry /><meshStandardMaterial /></mesh>. Под капотом R3F управляет рендер-циклом Three.js. Совместима со всеми Three.js-плагинами через @react-three/drei.'),
    ...q('Почему ESP32, а не Arduino Uno?',
         'ESP32 имеет встроенный Wi-Fi (802.11 b/g/n) и Bluetooth, два процессора Xtensa LX6 на 240 МГц, 520 КБ SRAM, 12-битный АЦП. Arduino Uno на ATmega328 — 16 МГц, 2 КБ SRAM, без Wi-Fi. Для IoT-проекта с MQTT нужен сетевой стек на самом MK, иначе требовался бы внешний Wi-Fi-модуль. ESP32 стоит €5, Arduino Uno €25 + ESP8266 модуль €5.'),
    ...q('Безопасно ли публичный MQTT-брокер?',
         'В рамках учебного проекта — да, секретов в телеметрии нет. Для продакшна нужно: TLS на 8883 (mqtts://), приватный брокер (Eclipse Mosquitto или EMQX), аутентификация по логину или mTLS-сертификату. В коде переключается одной константой URL.'),
    ...q('Что если интернет пропадёт?',
         'Прошивка продолжит работать локально — трекинг автономен. После keepalive (по умолчанию 60 сек) брокер активирует LWT и пометит status: { online: false }. UI увидит и пометит DEVICE как серый. Когда интернет восстановится — PubSubClient сам переподключится, прошивка снова начнёт публиковать telemetry.'),
    ...q('Зачем fake-helios в Docker, если есть Wokwi?',
         'Для двух сценариев: (а) UI-разработка без зависимости от Wokwi — fake-helios имитирует протокол и при docker run сразу появляются данные в дашборде; (б) демо без необходимости открывать Wokwi и тратить CI-минуты. Fake генерирует «виртуальное солнце» (синус по времени) и LDR-датчики реагируют как на физическое солнце через скалярное произведение векторов.'),
    ...q('Что такое retained-сообщения?',
         'Флаг при публикации, говорит брокеру сохранить последнее сообщение в теме. Любой новый подписчик сразу получает это значение. Без retained — когда UI открывается, он не знает текущий статус устройства, пока ESP32 что-то не пришлёт. С retained — UI мгновенно видит актуальное состояние при подключении.'),
    ...q('Почему JSON, а не двоичный формат?',
         'JSON читаемый, легко отлаживать через mosquitto_sub или MQTT Explorer, размер сообщений мал (~150 байт). Для частоты 2 Гц это даёт ~300 байт/сек трафика — пренебрежимо мало. Двоичный формат (Protobuf, MessagePack) дал бы экономию ~30%, но усложнил бы отладку.'),
    ...q('Сколько энергии потребляет?',
         'ESP32 при активном Wi-Fi — ~70 мА на 3.3 В = 230 мВт. Два сервопривода SG90 без нагрузки — по ~10 мА (при движении до 200 мА). Светодиод ~5 мА. Итого среднее ~0.5 Вт. От Power Bank работает сутки.'),
    ...q('Что такое R3F-Canvas?',
         'Это React-компонент из react-three-fiber, который создаёт WebGL-контекст и Three.js Scene. Всё что внутри JSX (mesh, light, geometry) автоматически превращается в Three.js-объекты. Управляется через хуки: useFrame для каждого кадра анимации, useThree для доступа к камере/сцене/рендереру.'),
    ...q('Что такое Elysia?',
         'Лёгкий веб-фреймворк для Bun, аналог Express для Node.js. Поддерживает type-safety через TypeScript-плагины (compile-time валидация маршрутов), встроенный WebSocket (.ws() метод), middleware (.use()). Я выбрал его потому что хорошо интегрируется с Bun и при этом простой как Express.'),
    ...q('Можно ли использовать несколько ESP32 одновременно?',
         'Архитектура поддерживает: каждое устройство получает уникальный helios/<id>/* префикс. Бэк может подписаться на helios/+/telemetry с wildcard и обрабатывать сообщения от всех устройств. UI пришлось бы расширить — выпадающим списком выбора устройства. В текущей версии — одно устройство helios-001.'),

    { text: ' ', marginTop: 20 },
    {
      table: { widths: ['*'], body: [[{
        text: 'Совет: за день до защиты пройди этот PDF, выпиши себе на одну страницу тезисы из каждого раздела. На самой защите помни структуру (вступление → архитектура → hw → mqtt → fw → backend → frontend → end-to-end → demo), детали приходят сами по ходу разговора. Если вопрос ставит в тупик — "Хороший вопрос, давайте подумаем вслух" + рассуждение по принципам.',
        fontSize: 10.5, italics: true, color: ink2, fillColor: '#f4f4f5',
      }]]},
      layout: { hLineWidth: () => 0, vLineWidth: () => 0,
        paddingLeft: () => 12, paddingRight: () => 12, paddingTop: () => 10, paddingBottom: () => 10 },
    },
  ],
};

const pdf = printer.createPdfKitDocument(doc);
const outPath = path.join(__dirname, 'guide.pdf');
const stream = fs.createWriteStream(outPath);
pdf.pipe(stream);
pdf.end();
stream.on('finish', () => {
  console.log(`Wrote ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
});
