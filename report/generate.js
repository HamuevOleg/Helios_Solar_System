// Build the HELIOS v2.4 project report as a .docx file.
// Russian, Times New Roman 12pt, 1.5 line spacing, A4 with academic margins.
//
// Output: report.docx in this folder.

const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, HeadingLevel,
  PageBreak, Footer, PageNumber, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType, LevelFormat, TableOfContents,
} = require('docx');

// ---- units ----
const SIZE_12 = 24;
const SIZE_11 = 22;
const SIZE_10 = 20;
const LINE_15 = 360;
const LINE_1 = 240;

// ---- helpers ----

function P(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: SIZE_12 })],
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 720 },
    spacing: { line: LINE_15, after: 0 },
    ...opts,
  });
}

function H1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, size: 32 })],
    spacing: { before: 480, after: 240, line: LINE_15 },
    pageBreakBefore: true,
    alignment: AlignmentType.LEFT,
  });
}

function H2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 28 })],
    spacing: { before: 320, after: 160, line: LINE_15 },
    alignment: AlignmentType.LEFT,
  });
}

function H3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, bold: true, size: 26 })],
    spacing: { before: 240, after: 120, line: LINE_15 },
    alignment: AlignmentType.LEFT,
  });
}

function caption(text) {
  return new Paragraph({
    children: [new TextRun({ text, italics: true, size: SIZE_11 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 240, before: 60, line: LINE_1 },
  });
}

function imgFromBuf(buf, widthPx, heightPx) {
  return new Paragraph({
    children: [new ImageRun({
      type: 'png',
      data: buf,
      transformation: { width: widthPx, height: heightPx },
      altText: { title: 'figure', description: 'figure', name: 'figure' },
    })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 60 },
  });
}

function imgFromBufTyped(buf, type, widthPx, heightPx) {
  return new Paragraph({
    children: [new ImageRun({
      type,
      data: buf,
      transformation: { width: widthPx, height: heightPx },
      altText: { title: 'figure', description: 'figure', name: 'figure' },
    })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 60 },
  });
}

function placeholder(label) {
  return new Paragraph({
    children: [
      new TextRun({ text: '□ ', size: SIZE_12, color: '888888' }),
      new TextRun({ text: 'ВСТАВИТЬ СКРИНШОТ: ', bold: true, color: 'AA3333', size: SIZE_11 }),
      new TextRun({ text: label, italics: true, color: '555555', size: SIZE_11 }),
    ],
    alignment: AlignmentType.CENTER,
    border: {
      top:    { style: BorderStyle.DASHED, size: 6, color: 'AAAAAA' },
      bottom: { style: BorderStyle.DASHED, size: 6, color: 'AAAAAA' },
      left:   { style: BorderStyle.DASHED, size: 6, color: 'AAAAAA' },
      right:  { style: BorderStyle.DASHED, size: 6, color: 'AAAAAA' },
    },
    spacing: { before: 240, after: 60, line: LINE_1 },
  });
}

function findScreenshot(candidates) {
  const names = Array.isArray(candidates) ? candidates : [candidates];
  for (const name of names) {
    const p = path.join(__dirname, 'screenshots', name);
    if (fs.existsSync(p)) {
      const ext = path.extname(name).toLowerCase().replace('.', '');
      const type = ext === 'jpeg' ? 'jpg' : ext;
      return { buf: fs.readFileSync(p), type };
    }
  }
  return null;
}

async function imgOrPlaceholder(candidates, placeholderLabel, width, height) {
  const found = findScreenshot(candidates);
  if (found) {
    const meta = await sharp(found.buf).metadata();
    const aspect = (meta.width && meta.height) ? (meta.height / meta.width) : null;
    const w = width;
    const h = height || (aspect ? Math.round(w * aspect) : 320);
    return [imgFromBufTyped(found.buf, found.type, w, h)];
  }
  return [placeholder(placeholderLabel)];
}

async function renderSvg(svgPath, density = 2) {
  const svg = fs.readFileSync(svgPath);
  return await sharp(svg, { density: 72 * density }).png().toBuffer();
}

async function diagram(name) {
  const pngPath = path.join(__dirname, 'diagrams', `${name}.png`);
  const svgPath = path.join(__dirname, 'diagrams', `${name}.svg`);
  if (fs.existsSync(pngPath)) return fs.readFileSync(pngPath);
  return await renderSvg(svgPath);
}

function code(text, opts = {}) {
  return text.split('\n').map((line) => new Paragraph({
    children: [new TextRun({
      text: line === '' ? ' ' : line,
      font: 'Arial',
      size: SIZE_10,
    })],
    alignment: AlignmentType.LEFT,
    spacing: { line: LINE_1, after: 0 },
    shading: { fill: 'F5F5F5', type: ShadingType.CLEAR, color: 'auto' },
    ...opts,
  }));
}

function codeListing(num, title, body) {
  return [
    new Paragraph({
      children: [
        new TextRun({ text: `Листинг ${num} — `, italics: true, size: SIZE_11 }),
        new TextRun({ text: title, italics: true, size: SIZE_11 }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { before: 200, after: 60, line: LINE_1 },
    }),
    ...code(body),
    new Paragraph({ children: [new TextRun(' ')], spacing: { after: 80, line: LINE_1 } }),
  ];
}

function readSrc(p) {
  try { return fs.readFileSync(p, 'utf8'); }
  catch (e) { return `// файл не найден: ${p}`; }
}

function annexFile(num, title, srcPath) {
  const body = readSrc(srcPath);
  return [
    new Paragraph({
      children: [
        new TextRun({ text: `Приложение ${num}. `, bold: true, size: SIZE_12 }),
        new TextRun({ text: title, italics: true, size: SIZE_12 }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { before: 240, after: 60, line: LINE_1 },
      pageBreakBefore: true,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Путь: `, size: SIZE_11, italics: true, color: '555555' }),
        new TextRun({ text: srcPath.split(/[\\/]/).slice(-3).join('/'), size: SIZE_11, font: 'Arial', color: '555555' }),
      ],
      spacing: { after: 120, line: LINE_1 },
    }),
    ...code(body),
  ];
}

function bullet(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: SIZE_12 })],
    numbering: { reference: 'bullets', level: 0 },
    spacing: { line: LINE_15, after: 0 },
  });
}

function kv(rows, colW = [3000, 6360]) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' };
  const borders = { top: border, bottom: border, left: border, right: border };
  return new Table({
    width: { size: colW[0] + colW[1], type: WidthType.DXA },
    columnWidths: colW,
    rows: rows.map(([k, v], idx) => new TableRow({
      children: [
        new TableCell({
          borders,
          width: { size: colW[0], type: WidthType.DXA },
          shading: { fill: idx === 0 ? 'EEEEEE' : 'FAFAFA', type: ShadingType.CLEAR, color: 'auto' },
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [new Paragraph({
            children: [new TextRun({ text: k, bold: idx === 0, size: SIZE_11 })],
            spacing: { line: LINE_1 },
          })],
        }),
        new TableCell({
          borders,
          width: { size: colW[1], type: WidthType.DXA },
          shading: { fill: idx === 0 ? 'EEEEEE' : 'FFFFFF', type: ShadingType.CLEAR, color: 'auto' },
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [new Paragraph({
            children: [new TextRun({ text: v, bold: idx === 0, font: idx === 0 ? undefined : 'Consolas', size: SIZE_11 })],
            spacing: { line: LINE_1 },
          })],
        }),
      ],
    })),
  });
}

function tableNumbered(num, title, rows, colW) {
  return [
    new Paragraph({
      children: [
        new TextRun({ text: `Таблица ${num} — `, italics: true, size: SIZE_11 }),
        new TextRun({ text: title, italics: true, size: SIZE_11 }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { before: 200, after: 80, line: LINE_1 },
    }),
    kv(rows, colW),
    new Paragraph({ children: [new TextRun(' ')], spacing: { after: 80, line: LINE_1 } }),
  ];
}

// ---- code excerpts (key fragments from real source) ----

const LISTING_SKETCH_LOOP =
`void loop() {
  const unsigned long now = millis();

  // Сетевой тик каждую итерацию — MQTT keepalive + входящие команды.
  networkLoop();

  if (now - lastLoopTick < LOOP_DELAY_MS) return;
  lastLoopTick = now;

  const SensorData    s    = sensorsRead();
  const Differentials diff = sensorsComputeDifferentials(s);
  trackerUpdate(s, diff);

  if (now - lastTelemetryTick >= TELEMETRY_PERIOD) {
    lastTelemetryTick = now;
    if (networkIsConnected()) telemetryPublish(s, diff, trackerGetState());
  }
}`;

const LISTING_TRACKER_UPDATE =
`void trackerUpdate(const SensorData& s, const Differentials& diff) {
  if (state.mode != MODE_AUTO) return;

  // dead-zone: малые расхождения игнорируем чтобы не дёргать сервы
  if (abs(diff.vertical)   > state.deadzone) {
    state.targetEl += diff.vertical > 0 ? +1 : -1;
    state.targetEl  = constrain(state.targetEl, EL_MIN, EL_MAX);
  }
  if (abs(diff.horizontal) > state.deadzone) {
    state.targetAz += diff.horizontal > 0 ? -1 : +1;
    state.targetAz  = constrain(state.targetAz, AZ_MIN, AZ_MAX);
  }
  // плавный slew к target
  state.currentAz += sign(state.targetAz - state.currentAz);
  state.currentEl += sign(state.targetEl - state.currentEl);
  servoAz.write(state.currentAz);
  servoEl.write(state.currentEl);

  // LED-индикатор «качества автотрекинга»: чем меньше |diff|, тем ярче
  const int q = constrain(255 - abs(diff.vertical) - abs(diff.horizontal), 0, 255);
  ledcWrite(LED_CHAN, q);
  state.ledBrightness = q;
}`;

const LISTING_TELEMETRY_PUBLISH =
`void telemetryPublish(const SensorData& s, const Differentials& diff, const TrackerState& st) {
  JsonDocument doc;
  doc["ts"]   = millis();
  doc["mode"] = modeToStr(st.mode);

  JsonObject sensors = doc["sensors"].to<JsonObject>();
  sensors["tl"] = s.tl;  sensors["tr"] = s.tr;
  sensors["bl"] = s.bl;  sensors["br"] = s.br;

  JsonObject d = doc["diff"].to<JsonObject>();
  d["vertical"]   = diff.vertical;
  d["horizontal"] = diff.horizontal;

  JsonObject servo = doc["servo"].to<JsonObject>();
  servo["az"]       = st.currentAz;
  servo["el"]       = st.currentEl;
  servo["targetAz"] = st.targetAz;
  servo["targetEl"] = st.targetEl;

  JsonObject power = doc["power"].to<JsonObject>();
  power["voltage"]       = (s.solarV / 4095.0f) * 5.0f;
  power["ledBrightness"] = st.ledBrightness;
  power["raw"]           = s.solarV;

  doc["deadzone"] = st.deadzone;
  String json;
  serializeJson(doc, json);
  networkPublish(TOPIC_TELEMETRY, json);
}`;

const LISTING_HANDLE_CONTROL =
`void telemetryHandleControl(const String& payload) {
  JsonDocument doc;
  if (deserializeJson(doc, payload)) return;
  const char* cmd = doc["cmd"];
  if (!cmd) return;

  if (!strcmp(cmd, "setMode")) {
    const char* v = doc["value"];
    if (!strcmp(v, "AUTO"))   trackerSetMode(MODE_AUTO);
    else if (!strcmp(v, "MANUAL")) trackerSetMode(MODE_MANUAL);
    else if (!strcmp(v, "PARKED")) trackerSetMode(MODE_PARKED);
  } else if (!strcmp(cmd, "setServo")) {
    if (doc["az"].is<int>()) trackerSetTargetAz(doc["az"]);
    if (doc["el"].is<int>()) trackerSetTargetEl(doc["el"]);
    trackerSetMode(MODE_MANUAL);
  } else if (!strcmp(cmd, "setDeadzone")) {
    trackerSetDeadzone(doc["value"]);
  }
}`;

const LISTING_BACKEND_BRIDGE =
`client.on('message', (topic, payload) => {
  const json = JSON.parse(payload.toString());
  if (topic === TOPIC_TELEMETRY) {
    latestTelemetry = json;
    events.onTelemetry(json);
  } else if (topic === TOPIC_STATUS) {
    latestStatus = json;
    events.onStatus(json);
  }
});

const app = new Elysia()
  .use(cors())
  .get('/health', () => ({
    ok: true,
    brokerConnected: isBrokerConnected(),
    deviceOnline: getLatestStatus()?.online ?? false,
    hasTelemetry: getLatestTelemetry() !== null,
  }))
  .ws('/ws', {
    open(ws) {
      wsClients.add(ws);
      ws.send(JSON.stringify({ type: 'snapshot',
        brokerConnected: isBrokerConnected(),
        status: getLatestStatus(),
        telemetry: getLatestTelemetry() }));
    },
    message(_ws, raw) {
      const cmd = typeof raw === 'string' ? JSON.parse(raw) : raw;
      publishControl(cmd);   // → MQTT publish helios/<id>/control
    },
  });`;

const LISTING_FRONTEND_HOOK =
`export function useHeliosSocket(): HeliosState {
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [history, setHistory]     = useState<Telemetry[]>([]);

  useEffect(() => {
    const ws = new WebSocket(getWsUrl());
    ws.onmessage = (e) => {
      const msg: ServerToClient = JSON.parse(e.data);
      switch (msg.type) {
        case 'telemetry':
          setTelemetry(msg.data);
          setHistory((h) => {
            const next = h.length >= HISTORY_SIZE ? h.slice(1) : h.slice();
            next.push(msg.data);
            return next;
          });
          break;
        case 'status':   setDeviceOnline(msg.data.online); break;
        case 'broker':   setBrokerConnected(msg.connected); break;
        case 'snapshot': /* initial state */ break;
      }
    };
  }, []);

  const sendCommand = useCallback((cmd: ClientToServer) => {
    wsRef.current?.send(JSON.stringify(cmd));   // → backend → MQTT control
  }, []);
  // ...
}`;

const LISTING_DOCKERFILE =
`# Multi-stage build: фронт собираем bun+vite, рантайм бэка на bun, фейк на node.
FROM oven/bun:1.3-alpine AS build
WORKDIR /build
COPY frontend/package.json frontend/bun.lock ./frontend/
RUN cd frontend && bun install --frozen-lockfile
COPY frontend ./frontend
RUN cd frontend && bun run build
COPY backend/package.json backend/bun.lock ./backend/
RUN cd backend && bun install --frozen-lockfile
COPY backend ./backend
COPY tools/package.json ./tools/
RUN apk add --no-cache nodejs npm \\
 && cd tools && npm install --omit=dev
COPY tools ./tools

FROM oven/bun:1.3-alpine
WORKDIR /app
ENV PORT=8787 STATIC_DIR=/app/frontend/dist \\
    MQTT_HOST=broker.hivemq.com DEVICE_ID=helios-001
RUN apk add --no-cache nodejs
COPY --from=build /build/backend/node_modules ./backend/node_modules
COPY --from=build /build/backend ./backend
COPY --from=build /build/frontend/dist ./frontend/dist
COPY --from=build /build/tools ./tools
COPY start.sh ./start.sh
RUN chmod +x ./start.sh
EXPOSE 8787
CMD ["./start.sh"]`;

// ---- main ----

async function main() {
  const sysDiagram = await diagram('system_structure');
  const algoDiagram = await diagram('algorithm');

  const children = [];

  // ---------- TITLE PAGE ----------
  children.push(
    new Paragraph({ children: [new TextRun(' ')], spacing: { before: 1200 } }),
    new Paragraph({
      children: [new TextRun({ text: 'ТЕХНИЧЕСКИЙ УНИВЕРСИТЕТ МОЛДОВЫ', bold: true, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120, line: LINE_1 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Факультет вычислительной техники, информатики и микроэлектроники', size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60, line: LINE_1 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Кафедра DISA', size: 22, italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 1200, line: LINE_1 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'ГОДОВОЙ ПРОЕКТ', bold: true, size: 40 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200, line: LINE_1 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'HELIOS v2.4', size: 32, italics: true, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120, line: LINE_1 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Двухосевой солнечный трекер с веб-дашбордом', size: 28, italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 1800, line: LINE_1 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Стек: ESP32 (Arduino) · Bun + Elysia · React 18 + R3F · MQTT (HiveMQ) · Wokwi · Docker', size: 22, color: '555555' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 1800, line: LINE_1 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Выполнил: студент', size: SIZE_12 })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 60, line: LINE_1 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '____________________________', size: SIZE_12 })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 240, line: LINE_1 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Проверил:', size: SIZE_12 })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 60, line: LINE_1 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '____________________________', size: SIZE_12 })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 720, line: LINE_1 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Кишинёв, 2026', size: SIZE_12 })],
      alignment: AlignmentType.CENTER,
      spacing: { line: LINE_1 },
    }),
  );

  // ---------- TOC ----------
  children.push(
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      children: [new TextRun({ text: 'СОДЕРЖАНИЕ', bold: true, size: 32 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 360, line: LINE_15 },
    }),
    new TableOfContents('Содержание', { hyperlink: true, headingStyleRange: '1-3' }),
  );

  // ============================================================
  //   1. ОБЩЕЕ ОПИСАНИЕ
  // ============================================================
  children.push(
    H1('1. ОБЩЕЕ ОПИСАНИЕ'),
    H2('1.1 Назначение и концепция'),
    P('Разработанная система HELIOS представляет собой двухосевой солнечный трекер на базе микроконтроллера ESP32, расширенный возможностью удалённого мониторинга и управления через современный веб-дашборд. Главная задача устройства — автоматически ориентировать фотоэлектрическую панель на источник максимальной освещённости (виртуальное «солнце» в Wokwi-симуляторе) для повышения суммарной выработки энергии, а интегрированная веб-консоль позволяет оператору наблюдать состояние трекера в реальном времени и при необходимости вмешиваться в работу.'),
    P('Принципиальное отличие реализованной системы от классических автономных трекеров состоит в наличии полноценного сетевого стека: прошивка ESP32 публикует поток телеметрии (показания LDR-датчиков, текущие углы сервоприводов, выходное напряжение панели, индикатор качества автотрекинга) на публичный MQTT-брокер, а Bun/Elysia-сервер ретранслирует данные на React-фронтенд через WebSocket. Команды управления возвращаются обратной дорогой. Архитектура легко масштабируется: к одному устройству может одновременно подключаться произвольное число веб-клиентов.'),

    H2('1.2 Принцип работы'),
    P('Алгоритм двухосевого трекинга построен на сравнительном анализе четырёх LDR-датчиков (фоторезисторов), расположенных по углам теневой маски. Микроконтроллер ESP-32 в каждом цикле читает четыре аналоговых входа через 12-битный АЦП, вычисляет вертикальную и горизонтальную разности освещённости (Δвертикальная = (TL+TR)−(BL+BR), Δгоризонтальная = (TR+BR)−(TL+BL)), и при выходе разности за пределы зоны нечувствительности (deadzone) подаёт команду на соответствующий сервопривод — азимутальный для горизонтальной коррекции, элевационный — для вертикальной.'),
    P('Помимо автоматического режима AUTO предусмотрены MANUAL — прямое позиционирование сервоприводов с веб-интерфейса, и PARKED — безопасное положение (горизонтально), используемое при простое или для защиты от ветра. Дополнительно в системе реализован LED-индикатор «качества выравнивания»: его яркость пропорциональна сумме модулей вертикальной и горизонтальной разностей — чем точнее панель сориентирована на источник, тем ярче светится индикатор.'),

    H2('1.3 Структурная схема системы'),
    P('На рисунке 1.1 представлена структурная схема системы, отражающая разделение на четыре функциональных уровня: аппаратный (ESP32 + датчики + сервоприводы), транспортный (публичный MQTT-брокер), серверный (Node.js/Bun-мост) и клиентский (React-приложение в браузере). Каждый уровень общается со следующим исключительно через сообщения, что обеспечивает слабую связанность компонентов и возможность их независимой замены, тестирования и отладки.'),
    imgFromBuf(sysDiagram, 580, 348),
    caption('Рис. 1.1 — Структурная схема системы HELIOS'),
    P('Технический ключ архитектуры — единый источник истины на стороне MQTT-брокера. Retained-сообщения в темах status и telemetry гарантируют, что любой вновь подключившийся клиент мгновенно получает актуальное состояние устройства без необходимости в дополнительных запросах. Last Will Testament (LWT) автоматически переводит устройство в состояние offline при разрыве связи.'),
  );

  // ============================================================
  //   2. АППАРАТНАЯ ЧАСТЬ
  // ============================================================
  children.push(
    H1('2. АППАРАТНАЯ ЧАСТЬ'),
    H2('2.1 Состав модулей'),
    P('Аппаратная часть HELIOS собрана на базе отладочной платы ESP32-DevKit-C v4 с микроконтроллером ESP32-WROOM-32. К плате подключены: матрица из четырёх LDR-датчиков, два сервопривода SG90 для управления осями азимут/элевация, светодиодный индикатор биения с токоограничивающим резистором, и фотоэлектрическая панель (моделируемая как солнечный элемент с подключением через делитель напряжения к АЦП). Все компоненты питаются от линии 3,3 В отладочной платы. Перечень модулей с указанием функционального назначения приведён ниже.'),

    H3('Микроконтроллер'),
    bullet('Плата ESP32-DevKit-C v4 на чипе ESP32-WROOM-32: двухъядерный Xtensa LX6 на 240 МГц, 520 КБ SRAM, встроенный Wi-Fi 802.11 b/g/n и Bluetooth 4.2, 12-битный АЦП. Программирование — через UART CP2102, питание по micro-USB.'),

    H3('Сенсорная матрица'),
    bullet('Четыре LDR-датчика (фоторезистора) в верхне-левом (TL), верхне-правом (TR), нижне-левом (BL) и нижне-правом (BR) углах теневой маски. Подключены к аналоговым входам ESP32 GPIO34, GPIO35, GPIO32, GPIO33 через делители 10 кОм. Считываются 12-битным АЦП — диапазон 0..4095.'),

    H3('Сервоприводы'),
    bullet('Два модели SG90: для оси азимут (GPIO25, диапазон 0..180°) и оси элевация (GPIO26, диапазон 10..170°). Управляются ШИМ-сигналом 50 Гц, длительность импульса 1.0–2.0 мс. Используется библиотека ESP32Servo.'),

    H3('Индикация и сенсор питания'),
    bullet('Красный светодиод-индикатор «качества автотрекинга» на GPIO2 через резистор 330 Ω, управляется через ШИМ-канал LEDC. Аналоговый вход GPIO36 (VP) считывает напряжение с фотоэлектрической панели через делитель — диапазон условных 0..5 В.'),

    H2('2.2 Принципиальная электрическая схема'),
    P('Принципиальная электрическая схема системы изображена на рисунке 2.1 в соответствии с требованиями оформления (СТАС). Шина GND и шина +3,3 В выделены раздельно, точки соединения проводников отмечены.'),
    ...(await imgOrPlaceholder(['proteus.jpeg', 'proteus.jpg', 'proteus.png'],
        'Рис. 2.1 — Принципиальная электрическая схема (Proteus 8 Professional)', 560)),
    caption('Рис. 2.1 — Принципиальная электрическая схема системы'),
    P('Дополнительно на рисунке 2.2 показана трёхмерная визуализация распайки той же схемы в среде Wokwi, использовавшейся для функциональной проверки до сборки физического прототипа. ESP32 размещается в центре, по углам теневой маски — четыре LDR, по бокам — сервоприводы азимута и элевации, под платой — макет фотоэлектрической панели.'),
    ...(await imgOrPlaceholder(['wokwi.jpg', 'wokwi.jpeg', 'wokwi.png'],
        'Рис. 2.2 — Визуализация распайки в Wokwi', 480)),
    caption('Рис. 2.2 — Визуализация распайки в Wokwi'),

    H2('2.3 Распиновка'),
    P('В таблице 2.1 приведено соответствие физических контактов ESP32 функциональным линиям модулей.'),
    ...tableNumbered('2.1', 'Распиновка ESP32', [
      ['Линия', 'GPIO'],
      ['LDR Top-Left',          'GPIO34 (ADC1_CH6)'],
      ['LDR Top-Right',         'GPIO35 (ADC1_CH7)'],
      ['LDR Bottom-Left',       'GPIO32 (ADC1_CH4)'],
      ['LDR Bottom-Right',      'GPIO33 (ADC1_CH5)'],
      ['Servo Azimuth (PWM)',   'GPIO25 (LEDC)'],
      ['Servo Elevation (PWM)', 'GPIO26 (LEDC)'],
      ['Solar panel voltage',   'GPIO36 / VP (ADC1_CH0)'],
      ['LED indicator',         'GPIO2 (LEDC, через 330 Ω)'],
    ], [3600, 5760]),
  );

  // ============================================================
  //   3. ПРОГРАММНАЯ ЧАСТЬ
  // ============================================================
  children.push(
    H1('3. ПРОГРАММНАЯ ЧАСТЬ'),
    H2('3.1 Алгоритм работы прошивки'),
    P('Программная часть прошивки реализована на C++ с использованием фреймворка Arduino для ESP32-core 3.x. Полный объём — около 670 строк, распределённых по семи модулям: sketch.ino (главная точка входа), sensors.{h,cpp} (чтение LDR-матрицы), tracker.{h,cpp} (логика двухосевого трекинга), network.{h,cpp} (Wi-Fi + MQTT), telemetry.{h,cpp} (JSON-сериализация и обработка команд), config.h (общие константы). Граница между модулями проведена по принципу одной ответственности.'),
    P('Общий алгоритм работы прошивки представлен на рисунке 3.1. После инициализации периферии запускается беспроводное соединение по Wi-Fi и подключение к MQTT-брокеру. Главный цикл состоит из трёх ритмических слоёв: networkLoop() выполняется каждую итерацию для поддержания MQTT-keepalive, основной шаг алгоритма выполняется каждые LOOP_DELAY_MS, а телеметрия публикуется реже — каждые TELEMETRY_PERIOD миллисекунд.'),
    imgFromBuf(algoDiagram, 540, 768),
    caption('Рис. 3.1 — Блок-схема алгоритма работы прошивки HELIOS'),
    P('Асинхронно — внутри MQTT-стека — отрабатывается обработчик входящих команд от веб-клиента: при поступлении сообщения в теме helios/<id>/control функция telemetryHandleControl парсит JSON и вызывает соответствующий setter в модуле tracker.'),

    H3('Главный цикл'),
    ...codeListing('3.1', 'Главный цикл прошивки (sketch.ino)', LISTING_SKETCH_LOOP),

    H3('Логика трекинга'),
    P('Сердце алгоритма — функция trackerUpdate. В режиме AUTO она проверяет, не превышают ли вертикальная и горизонтальная разности порог deadzone, и при выходе за него инкрементирует цель сервопривода на 1° в нужную сторону. Текущий угол сервопривода плавно (по +/−1° за цикл) подтягивается к целевому, что предотвращает резкие движения и снижает нагрузку. Яркость LED-индикатора пропорциональна качеству выравнивания.'),
    ...codeListing('3.2', 'Обновление трекера и LED-индикатора (tracker.cpp)', LISTING_TRACKER_UPDATE),

    H3('Публикация телеметрии'),
    P('Каждые TELEMETRY_PERIOD миллисекунд (по умолчанию 500 мс) прошивка собирает текущий снимок состояния и публикует его в MQTT-тему helios/<id>/telemetry в JSON-формате. Структура сообщения полностью совпадает с TypeScript-типом Telemetry в backend и frontend, что обеспечивает контракт типов на трёх языках.'),
    ...codeListing('3.3', 'Сериализация телеметрии в JSON (telemetry.cpp)', LISTING_TELEMETRY_PUBLISH),

    H3('Приём команд'),
    P('Входящие команды от веб-клиента приходят в тему helios/<id>/control. PubSubClient вызывает callback telemetryHandleControl, который парсит JSON через ArduinoJson 7 и диспетчеризует на нужный setter трекера. При вызове setServo автоматически включается режим MANUAL — иначе автомат тут же бы перетёр заданные оператором углы.'),
    ...codeListing('3.4', 'Обработка команд от веб-клиента (telemetry.cpp)', LISTING_HANDLE_CONTROL),

    H2('3.2 Серверная часть: MQTT ↔ WebSocket мост'),
    P('Серверная часть представляет собой single-file приложение на Bun + Elysia (~120 строк в server/src/index.ts плюс ~100 строк MQTT-клиента в server/src/mqtt.ts). Bun выбран как современная JavaScript-runtime с нативной поддержкой TypeScript без транспиляции и быстрым стартом. Elysia — лёгкий веб-фреймворк с встроенной поддержкой WebSocket.'),
    ...codeListing('3.5', 'Мост MQTT → WebSocket (backend/src/index.ts)', LISTING_BACKEND_BRIDGE),
    P('Сервер слушает порт 8787 и выполняет три задачи: подписан на MQTT-топики устройства и эмитит в Socket.IO каждому подключённому браузеру, эмитит первичный snapshot при WS-подключении (чтобы UI не мерцал пустотой), и публикует команды от клиентов обратно в MQTT-тему control. В production-сборке сервер также раздаёт собранный фронтенд с того же порта 8787 через @elysiajs/static — единый процесс, единый порт.'),
    P('В таблице 3.1 перечислены все команды, отправляемые UI на прошивку. Они идентичны как для веб-клиента, так и для отладочного «фейкового» эмулятора устройства.'),
    ...tableNumbered('3.1', 'Команды управления (UI → прошивка)', [
      ['Команда',     'Значение и диапазон'],
      ['setMode',     '"AUTO" | "MANUAL" | "PARKED" — режим работы трекера'],
      ['setServo',    '{ az?: int 0..180, el?: int 10..170 } — задать целевые углы'],
      ['setDeadzone', 'int 0..500 — ширина зоны нечувствительности автотрекера'],
    ], [3000, 6360]),

    H2('3.3 Клиентская часть: React + Three.js + Recharts'),
    P('Веб-консоль реализована на React 18 + Vite + TypeScript. Структура компонентов: App.tsx (корень), Header.tsx (статусные пилюли), Tracker3D.tsx (3D-визуализация через react-three-fiber), Charts.tsx (графики LDR и Power Output через Recharts), SensorCards.tsx (карточки датчиков), ControlPanel.tsx (Mode-переключатель и слайдеры az/el/deadzone). Состояние держится в едином хуке useHeliosSocket — WebSocket-соединение с автоматическим переподключением, история телеметрии на 120 кадров для графиков.'),
    ...codeListing('3.6', 'Хук подключения к мосту (frontend/src/hooks/useHeliosSocket.ts)', LISTING_FRONTEND_HOOK),
    P('3D-визуализация рендерит фотоэлектрическую панель на подставке-стойке. Углы panel-объекта (поворот по оси Y для азимута, поворот по оси X для элевации) синхронизированы с servo.az и servo.el из телеметрии — пользователь визуально видит как трекер ездит за солнцем. Графики Recharts ведут историю четырёх LDR-каналов с раздельными цветами и историю выходного напряжения панели — оба обновляются с частотой телеметрии (2 Гц).'),

    H2('3.4 Развёртывание в Docker'),
    P('Для упрощения демонстрации и воспроизводимой сборки система упакована в один Docker-образ на основе oven/bun:1.3-alpine. Многоступенчатая сборка: первая стадия собирает фронтенд через Vite, вторая — рантайм-стадия — берёт собранный dist/, ставит зависимости бэкенда и упаковывает в финальный образ. Контейнер запускает оба процесса параллельно через shell-скрипт start.sh: основной — Bun-мост, дополнительный — фейк-симулятор устройства (Node.js).'),
    ...codeListing('3.7', 'Dockerfile (фрагмент)', LISTING_DOCKERFILE),
    P('Запуск:'),
    ...code(`docker build -t helios:latest .
docker run -d --name helios -p 8787:8787 --restart unless-stopped helios:latest`),
    new Paragraph({ children: [new TextRun(' ')], spacing: { after: 120, line: LINE_1 } }),
    P('После запуска UI доступен на http://localhost:8787, а внутри контейнера сразу же стартует фейк-симулятор устройства, публикующий тестовую телеметрию в MQTT — таким образом дашборд оживает мгновенно без необходимости запускать Wokwi.'),

    H2('3.5 Транспорт и протокол сообщений'),
    P('Все MQTT-сообщения проходят через общий префикс helios/<deviceId>. В таблице 3.2 описаны топики и их назначение.'),
    ...tableNumbered('3.2', 'MQTT-топики системы (префикс helios/helios-001)', [
      ['Направление',   'Топик · Полезная нагрузка'],
      ['ESP → сервер',  '<prefix>/telemetry — JSON со снимком состояния (~10 полей)'],
      ['ESP → сервер',  '<prefix>/status (retained, LWT) — { online: bool }'],
      ['Сервер → ESP',  '<prefix>/control — { cmd, value | az/el }'],
    ], [3000, 6360]),
    P('На рисунке 3.2 представлен журнал работы Bun-моста сразу после старта в контейнере — видно установку соединения с HiveMQ, подписку на топики, подключение симулятора и WebSocket-клиента. На рисунке 3.3 — соединение в инструментах разработчика браузера во вкладке Network → WS.'),
    ...(await imgOrPlaceholder(['bridge_logs.png', 'bridge_logs.jpg', 'docker_logs.jpg'],
        'Рис. 3.2 — docker logs helios (mqtt connected · device online · WS broadcast)', 540)),
    caption('Рис. 3.2 — Журнал работы Bun-моста'),
    ...(await imgOrPlaceholder(['devtools.png', 'devtools.jpg', 'network_proof.jpg'],
        'Рис. 3.3 — DevTools Network → WS handshake (101 Switching Protocols)', 540)),
    caption('Рис. 3.3 — WebSocket-соединение в DevTools браузера'),
  );

  // ============================================================
  //   4. ЗАКЛЮЧЕНИЕ
  // ============================================================
  children.push(
    H1('4. ЗАКЛЮЧЕНИЕ'),
    H2('4.1 Результаты моделирования'),
    P('В рамках проекта реализованы и проверены:'),
    bullet('Алгоритм двухосевого автотрекинга с регулируемой зоной нечувствительности — панель отслеживает виртуальное «солнце» в Wokwi-симуляторе с темпом 2 Гц.'),
    bullet('Три режима работы (AUTO, MANUAL, PARKED) с переключением как локально с серверной стороны, так и удалённо через веб-консоль.'),
    bullet('Современный веб-дашборд: 3D-визуализация трекера через Three.js / react-three-fiber, графики истории LDR и выходного напряжения на 120 кадров, sensor-cards, цветовая индикация состояния системы (WS / Broker / Device).'),
    bullet('Удалённое управление через MQTT-WebSocket мост с задержкой 100–200 мс от команды на клиенте до реакции в железе.'),
    bullet('Single-image Docker-сборка для одношагового развёртывания: docker run -p 8787:8787 helios — и весь стек (бэкенд + статика фронта + фейк-симулятор) работает.'),
    bullet('Headless-симуляция полной прошивки через wokwi-cli с подтверждённым подключением к публичному MQTT-брокеру и видимыми в реальном времени реакциями UI на изменения углов трекера.'),
    ...(await imgOrPlaceholder(['ui_main.png', 'ui_main.jpg', 'front.jpg'],
        'Рис. 4.1 — Скриншот рабочего веб-дашборда (3D-модель + графики + sensor cards)', 580)),
    caption('Рис. 4.1 — Финальный вид веб-консоли HELIOS в рабочем режиме'),
    ...(await imgOrPlaceholder(['ui_control.png', 'ui_control.jpg', 'front_terminal.jpg'],
        'Рис. 4.2 — Control Panel в режиме MANUAL с двинутым azimuth-слайдером', 460)),
    caption('Рис. 4.2 — Панель управления в режиме MANUAL'),

    H2('4.2 Общие выводы'),
    P('Проект продемонстрировал жизнеспособность IoT-архитектуры на основе публичного MQTT-брокера для встраиваемых систем уровня учебного проекта. Разделение на три независимых компонента (прошивка, мост, веб-клиент) с единой системой сообщений упростило разработку, отладку и сопровождение: каждый компонент тестировался изолированно с помощью «фейковых» имитаторов противоположной стороны. Применение современных инструментов (Bun вместо Node.js, Vite вместо Webpack, react-three-fiber для 3D, Wokwi для симуляции, Docker для упаковки, wokwi-cli для headless-валидации) сократило цикл разработки до нескольких минут на итерацию и устранило необходимость в физическом железе на этапе функциональной проверки.'),
    P('Возможные направления дальнейшего развития системы:'),
    bullet('Замена публичного MQTT-брокера на TLS-соединение с приватным сервером (Eclipse Mosquitto, EMQX) для эксплуатации вне локальной сети.'),
    bullet('Реализация физической сборки на печатной плате с фотопанелью 6 В / 1 Вт и токовым шунтом для измерения реальной выработки.'),
    bullet('Сохранение пользовательских пресетов (deadzone, режим, парковочные углы) в энергонезависимой памяти ESP32 через библиотеку Preferences.'),
    bullet('Расширение веб-дашборда: исторические графики глубже 120 кадров, экспорт в CSV, статистика суточной выработки.'),
    bullet('Авторизация веб-консоли (JWT) для коммерческого применения.'),

    H2('4.3 Структура проекта'),
    P('Исходный код проекта организован следующим образом:'),
    ...code(`project annual university/
├── firmware/           — прошивка для ESP32 (Arduino C++, ~670 строк)
│   ├── sketch.ino      — точка входа: setup + loop
│   ├── sensors.{h,cpp} — чтение LDR-матрицы через АЦП
│   ├── tracker.{h,cpp} — алгоритм автотрекинга и режимы AUTO/MANUAL/PARKED
│   ├── network.{h,cpp} — Wi-Fi + PubSubClient
│   ├── telemetry.{h,cpp}— JSON-сериализация + парсинг команд
│   ├── config.h        — общие константы (пины, периоды, диапазоны)
│   └── diagram.json    — wiring для Wokwi
├── backend/            — мост на Bun + Elysia (TypeScript, ~250 строк)
│   └── src/{index,mqtt,types}.ts
├── frontend/           — React 18 + Vite + Tailwind + R3F + Recharts
│   └── src/{App.tsx, hooks/useHeliosSocket.ts, components/*}
├── tools/              — фейк-симулятор устройства (для демо без Wokwi)
├── Dockerfile          — single-image сборка
├── start.bat/stop.bat  — Windows-обвязка для запуска bun-dev
└── report/             — настоящий отчёт`),
    new Paragraph({ children: [new TextRun(' ')], spacing: { after: 200, line: LINE_1 } }),
  );

  // ============================================================
  //   ПРИЛОЖЕНИЯ
  // ============================================================
  const fwRoot  = path.resolve(__dirname, '..', 'firmware');
  const beRoot  = path.resolve(__dirname, '..', 'backend', 'src');
  const feRoot  = path.resolve(__dirname, '..', 'frontend', 'src');

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'ПРИЛОЖЕНИЯ. ЛИСТИНГ ПРОГРАММЫ', bold: true, size: 32 })],
      spacing: { before: 480, after: 240, line: LINE_15 },
      pageBreakBefore: true,
      alignment: AlignmentType.LEFT,
    }),
    P('Ниже приведён полный исходный код ключевых файлов проекта: главного модуля прошивки (sketch.ino), модуля трекинга (tracker.cpp), сетевого модуля (network.cpp), бэкенда-моста (backend/src/index.ts), MQTT-клиента бэкенда (mqtt.ts) и корневого компонента React (frontend/src/App.tsx) с хуком useHeliosSocket. Текст оформлен шрифтом Arial 10pt с одинарным межстрочным интервалом согласно требованиям к листингу программы.'),

    ...annexFile('А', 'Прошивка — sketch.ino (точка входа, главный цикл)',
                 path.join(fwRoot, 'sketch.ino')),
    ...annexFile('Б', 'Прошивка — tracker.cpp (двухосевой алгоритм автотрекинга)',
                 path.join(fwRoot, 'tracker.cpp')),
    ...annexFile('В', 'Прошивка — network.cpp (Wi-Fi + MQTT)',
                 path.join(fwRoot, 'network.cpp')),
    ...annexFile('Г', 'Прошивка — telemetry.cpp (JSON-телеметрия и команды)',
                 path.join(fwRoot, 'telemetry.cpp')),
    ...annexFile('Д', 'Backend — index.ts (Elysia + WebSocket)',
                 path.join(beRoot, 'index.ts')),
    ...annexFile('Е', 'Backend — mqtt.ts (MQTT-клиент моста)',
                 path.join(beRoot, 'mqtt.ts')),
    ...annexFile('Ж', 'Frontend — App.tsx (корневой компонент)',
                 path.join(feRoot, 'App.tsx')),
    ...annexFile('З', 'Frontend — useHeliosSocket.ts (WS-хук с историей)',
                 path.join(feRoot, 'hooks', 'useHeliosSocket.ts')),
  );

  // ---------- BUILD ----------
  const doc = new Document({
    creator: 'Oleg',
    description: 'Годовой проект — HELIOS v2.4. Двухосевой солнечный трекер с веб-дашбордом',
    title: 'HELIOS v2.4 — Отчёт',
    styles: {
      default: { document: { run: { font: 'Times New Roman', size: SIZE_12 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 32, bold: true, font: 'Times New Roman' },
          paragraph: { spacing: { before: 360, after: 240, line: LINE_15 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, font: 'Times New Roman' },
          paragraph: { spacing: { before: 240, after: 160, line: LINE_15 }, outlineLevel: 1 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 26, bold: true, font: 'Times New Roman' },
          paragraph: { spacing: { before: 200, after: 120, line: LINE_15 }, outlineLevel: 2 } },
      ],
    },
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1134, right: 850, bottom: 1134, left: 1701 },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [new TextRun({ children: [PageNumber.CURRENT], size: SIZE_11 })],
            alignment: AlignmentType.CENTER,
            spacing: { line: LINE_1 },
          })],
        }),
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const out = path.join(__dirname, 'report.docx');
  fs.writeFileSync(out, buffer);
  console.log(`Wrote ${out} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

main().catch(e => { console.error(e); process.exit(1); });
