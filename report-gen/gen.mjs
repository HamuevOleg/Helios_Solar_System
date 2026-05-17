// HELIOS v2.4 — генератор отчёта (Proiect de an, UTM, FCIM, DISA).
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  PageBreak, Header, Footer, PageNumber, LevelFormat, convertInchesToTwip,
  HorizontalPositionRelativeFrom, HorizontalPositionAlign,
  TableOfContents, TableLayoutType,
} from 'docx';

/* Useable page width in twips: A4 11906 − left margin 1.2"(1728) − right margin 0.8"(1152) = 9026 */
const PAGE_TWIPS = 9000;
const pctToDxa = (pct) => Math.round((PAGE_TWIPS * pct) / 100);
import { writeFile } from 'node:fs/promises';

/* ── Palette ────────────────────────────────────────────────── */
const C = {
  ink:    '111827',
  muted:  '475569',
  rule:   'CBD5E1',
  panel:  'F3F4F6',
  panelBd:'E2E8F0',
  accent: 'EA580C',
  thHdr:  '1F2937',
  thAlt:  'F8FAFC',
};

const FONT  = 'Times New Roman';
const MONO  = 'Consolas';

/* ── Helpers ────────────────────────────────────────────────── */
const p = (text, opt = {}) => new Paragraph({
  spacing: { line: 360, before: 0, after: 120, ...opt.spacing },
  alignment: opt.align ?? AlignmentType.JUSTIFIED,
  indent: opt.indent ?? { firstLine: 720 },
  children: [new TextRun({ text, font: FONT, size: 24, ...opt.run })],
  ...(opt.extra ?? {}),
});

const plain = (text, opt = {}) => new Paragraph({
  spacing: { line: 360, before: 0, after: 80, ...opt.spacing },
  alignment: opt.align ?? AlignmentType.LEFT,
  indent: opt.indent ?? {},
  children: [new TextRun({ text, font: FONT, size: 24, ...opt.run })],
});

const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  alignment: AlignmentType.LEFT,
  spacing: { before: 360, after: 240, line: 360 },
  children: [new TextRun({ text: text.toUpperCase(), bold: true, font: FONT, size: 32, color: C.ink })],
  pageBreakBefore: true,
});

const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  alignment: AlignmentType.LEFT,
  spacing: { before: 280, after: 160, line: 360 },
  children: [new TextRun({ text, bold: true, font: FONT, size: 28, color: C.ink })],
});

const h3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  alignment: AlignmentType.LEFT,
  spacing: { before: 220, after: 140, line: 360 },
  children: [new TextRun({ text, bold: true, font: FONT, size: 26, color: C.ink })],
});

const bullet = (text) => new Paragraph({
  spacing: { line: 320, before: 0, after: 60 },
  indent: { left: 720, hanging: 360 },
  children: [new TextRun({ text: '• ' + text, font: FONT, size: 24 })],
});

/* ── Code block ─────────────────────────────────────────────── */
function codeBlock(code, lang = '') {
  const lines = code.replace(/\t/g, '  ').split('\n');
  const rows = lines.map((ln) => new TableRow({
    children: [new TableCell({
      width: { size: PAGE_TWIPS, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: C.panel },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.SINGLE, size: 24, color: C.accent },
        right: { style: BorderStyle.SINGLE, size: 4, color: C.panelBd },
      },
      margins: { top: 40, bottom: 40, left: 200, right: 200 },
      children: [new Paragraph({
        spacing: { line: 260, before: 0, after: 0 },
        children: [new TextRun({ text: ln || ' ', font: MONO, size: 20, color: C.ink })],
      })],
    })],
  }));
  return new Table({
    width: { size: PAGE_TWIPS, type: WidthType.DXA },
    columnWidths: [PAGE_TWIPS],
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [new TableCell({
          width: { size: PAGE_TWIPS, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: C.thHdr },
          borders: blankBorder(),
          margins: { top: 60, bottom: 60, left: 200, right: 200 },
          children: [new Paragraph({
            spacing: { line: 240 },
            children: [new TextRun({
              text: lang ? `  ${lang}` : '  code',
              font: MONO, size: 18, color: 'FFFFFF', bold: true,
            })],
          })],
        })],
      }),
      ...rows,
    ],
  });
}

function blankBorder() {
  return {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };
}

/* ── Table helper ──────────────────────────────────────────── */
function makeTable({ headers, rows, widths }) {
  const borders = {
    top:    { style: BorderStyle.SINGLE, size: 4, color: C.rule },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: C.rule },
    left:   { style: BorderStyle.SINGLE, size: 4, color: C.rule },
    right:  { style: BorderStyle.SINGLE, size: 4, color: C.rule },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: C.rule },
    insideVertical:   { style: BorderStyle.SINGLE, size: 4, color: C.rule },
  };
  // Compute column widths in DXA from a percent array (or equal split if absent).
  const colPct = widths && widths.length === headers.length
    ? widths
    : headers.map(() => 100 / headers.length);
  const colDxa = colPct.map(pctToDxa);

  const hdrRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      width: { size: colDxa[i], type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: C.thHdr },
      margins: { top: 100, bottom: 100, left: 140, right: 140 },
      children: [new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { line: 280, before: 0, after: 0 },
        children: [new TextRun({ text: h, font: FONT, size: 22, color: 'FFFFFF', bold: true })],
      })],
    })),
  });
  const bodyRows = rows.map((row, idx) => new TableRow({
    children: row.map((cell, ci) => new TableCell({
      width: { size: colDxa[ci], type: WidthType.DXA },
      shading: idx % 2 === 1 ? { type: ShadingType.CLEAR, fill: C.thAlt } : undefined,
      margins: { top: 80, bottom: 80, left: 140, right: 140 },
      children: cell.split('\n').map((line) => new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { line: 280, before: 0, after: 0 },
        children: [new TextRun({ text: line, font: FONT, size: 22, color: C.ink })],
      })),
    })),
  }));
  return new Table({
    width: { size: PAGE_TWIPS, type: WidthType.DXA },
    columnWidths: colDxa,
    layout: TableLayoutType.FIXED,
    borders,
    rows: [hdrRow, ...bodyRows],
  });
}

/* ── Spacer ─────────────────────────────────────────────────── */
const space = (size = 100) => new Paragraph({ spacing: { before: 0, after: size }, children: [] });

/* ─────────────────────────────────────────────────────────── */
/* TITLE PAGE                                                 */
/* ─────────────────────────────────────────────────────────── */
const TITLE_TEXTS = [
  'MINISTERUL EDUCAȚIEI ȘI CERCETĂRII',
  'al REPUBLICII MOLDOVA',
  'UNIVERSITATEA TEHNICĂ A MOLDOVEI',
  'FACULTATEA CALCULATOARE, INFORMATICĂ',
  'ȘI MICROELECTRONICĂ',
  'Departamentul Informatică și Ingineria Sistemelor',
];

const titlePage = [
  ...TITLE_TEXTS.map((t, i) => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: 340, before: i === 0 ? 0 : 60, after: 0 },
    children: [new TextRun({ text: t, font: FONT, size: 28, bold: i < 5 })],
  })),
  space(700),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: 360, after: 60 },
    children: [new TextRun({ text: 'Raport', font: FONT, size: 56, bold: true })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: 360, after: 60 },
    children: [new TextRun({ text: 'Proiect de an', font: FONT, size: 40, bold: true })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: 360, after: 60 },
    children: [new TextRun({ text: 'Aplicație Client–Server', font: FONT, size: 32, italics: true })],
  }),
  space(280),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: 340, after: 200 },
    children: [new TextRun({
      text: 'Tema: Двухосевой солнечный трекер с реалтайм-телеметрией\nи 3D-веб-дашбордом (HELIOS v2.4)',
      font: FONT, size: 28, bold: true,
    })],
  }),
  space(800),
  new Paragraph({
    spacing: { line: 360, after: 80 },
    children: [new TextRun({ text: 'Executant:   Hamuev O.', font: FONT, size: 26 })],
  }),
  new Paragraph({
    spacing: { line: 360, after: 80 },
    children: [new TextRun({ text: 'Grupa academică:  CR-233', font: FONT, size: 26 })],
  }),
  new Paragraph({
    spacing: { line: 360, after: 80 },
    children: [new TextRun({ text: '/____________________/', font: FONT, size: 24 })],
  }),
  space(120),
  new Paragraph({
    spacing: { line: 360, after: 80 },
    children: [new TextRun({ text: 'A verificat:  Calmîcov I.', font: FONT, size: 26 })],
  }),
  new Paragraph({
    spacing: { line: 360, after: 80 },
    children: [new TextRun({ text: '/____________________/', font: FONT, size: 24 })],
  }),
  space(800),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: 360 },
    children: [new TextRun({ text: 'Chișinău 2026', font: FONT, size: 28, bold: true })],
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

/* ─────────────────────────────────────────────────────────── */
/* TOC                                                        */
/* ─────────────────────────────────────────────────────────── */
const toc = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 360, line: 360 },
    children: [new TextRun({ text: 'СОДЕРЖАНИЕ', font: FONT, size: 32, bold: true })],
  }),
  new TableOfContents('Содержание', {
    hyperlink: true,
    headingStyleRange: '1-3',
    stylesWithLevels: [],
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

/* ─────────────────────────────────────────────────────────── */
/* CONTENT                                                    */
/* ─────────────────────────────────────────────────────────── */
const content = [];

/* INTRO */
content.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  alignment: AlignmentType.CENTER,
  spacing: { before: 0, after: 240, line: 360 },
  children: [new TextRun({ text: 'ВВЕДЕНИЕ', bold: true, font: FONT, size: 32 })],
}));
content.push(
  p('Возобновляемая энергетика стала ключевым направлением мирового развития. Среди всех её форм солнечная фотогальваника наиболее доступна, масштабируема и экономически выгодна как для крупных промышленных установок, так и для частных домохозяйств. Однако стационарная солнечная панель использует лишь часть доступной энергии: положение Солнца на небосводе меняется в течение дня и года, а угол падения лучей напрямую влияет на КПД фотоэлементов.'),
  p('Решением этой проблемы являются солнечные трекеры — электромеханические системы, которые ориентируют панель перпендикулярно солнечным лучам. По различным исследованиям, двухосевой трекинг увеличивает суммарную выработку панели на 25–45 % по сравнению со стационарной установкой того же номинала. Главным препятствием к массовому внедрению таких систем остаётся стоимость, сложность настройки и недостаток понятных учебных материалов, которые позволили бы инженеру-новичку шаг за шагом разобраться в архитектуре и алгоритмах трекинга.'),
  p('Параллельно с этим активно развивается направление Internet of Things (IoT). Современный IoT-проект всё реже представляет собой одно изолированное устройство и всё чаще — распределённую систему: микроконтроллер на стороне «железа», публичный или частный MQTT-брокер для маршрутизации сообщений, серверный шлюз, преобразующий поток данных в удобный для веб-интерфейса формат, и наконец, клиентское приложение, отображающее живое состояние установки и принимающее команды управления.'),
  p('Тема настоящего проекта — разработка двухосевого солнечного трекера HELIOS v2.4 в виде полностью симулированной системы. Под симуляцией здесь понимается выполнение прошивки в среде Wokwi, эмулирующей микроконтроллер ESP32 и подключённую к нему периферию (4 LDR-фотодатчика, два сервопривода и индикаторный светодиод). Симуляция выбрана сознательно: она снимает требование наличия физического оборудования и позволяет сосредоточиться на алгоритмах слежения, архитектуре сетевого взаимодействия и качестве пользовательского интерфейса.'),
  p('HELIOS v2.4 решает три прикладные задачи. Первая — самостоятельный двухосевой трекинг по показаниям четырёх LDR с обработкой ночного режима и плавным движением сервоприводов. Вторая — публикация JSON-телеметрии в публичный MQTT-брокер и приём команд управления через тот же брокер. Третья — интерактивный 3D-дашборд в браузере: он подписывается на телеметрию через WebSocket-шлюз, отображает состояние установки в режиме реального времени, рисует фотореалистичную трёхмерную модель трекера, графики ключевых параметров и панель ручного управления.'),
  p('Архитектурно проект разделён на три независимых модуля: firmware/ — прошивка ESP32 на C++, backend/ — Bun + ElysiaJS-сервер, выполняющий роль моста между MQTT-брокером и WebSocket-клиентами, и frontend/ — React-приложение, собираемое Vite, со сценой react-three-fiber и графиками Recharts. Все три модуля общаются строго через стандартные протоколы (MQTT, HTTP, WebSocket), что делает систему расширяемой: вместо симулятора Wokwi можно подставить реальный ESP32, вместо публичного брокера — частный, а вместо браузерного UI — мобильное приложение.'),
  p('Помимо демонстрации алгоритма, проект имеет образовательную ценность. Он показывает, как корректно строить IoT-приложение по двунаправленной схеме «команды / телеметрия», как организовать чистое разделение ответственности между прошивкой и сервером, и как создать современный фронтенд, который не выглядит как ещё один админ-шаблон. Особое внимание уделено качеству 3D-визуализации: сцена использует HDRI-окружение, физически корректные материалы (PBR), мягкие тени и постобработку, что превращает дашборд в наглядное и приятное в работе средство мониторинга.'),
);

/* ────────────────── 1. ANALYSIS ────────────────── */
content.push(h1('1. Анализ предметной области и рынка'));
content.push(h2('Существующие аналоги и их недостатки'));
content.push(
  p('Современный рынок солнечных трекеров принципиально разделён на два класса. Первый — коммерческие промышленные системы, которые поставляются в составе крупных солнечных электростанций. Это, как правило, закрытые проприетарные решения с собственным контроллером, защищёнными протоколами и SCADA-системой мониторинга. Их основные особенности — высокая надёжность и точность, но также крайне высокая цена, недоступность исходного кода и невозможность подключения к ним сторонних веб-интерфейсов или образовательных платформ.'),
  p('Второй класс — самодельные и учебные проекты на базе Arduino или ESP32, которых много в открытом сообществе. Несмотря на их популярность, у большинства из них есть общие недостатки: отсутствие сетевого взаимодействия и удалённой телеметрии, монолитный код в одном файле .ino без разделения на модули, отсутствие фильтрации сенсоров (показания LDR используются «сырыми», что приводит к рывкам сервоприводов), отсутствие алгоритма ночного парковочного режима и, как следствие, бесконечная попытка трекинга в темноте. Графические интерфейсы, если они и присутствуют, обычно ограничены примитивным виджетом на Blynk или Telegram-ботом.'),
  p('Также существуют коммерческие облачные платформы мониторинга (ThingsBoard, Blynk, Cayenne), которые предоставляют готовые виджеты для IoT-устройств. Их сильная сторона — отсутствие необходимости писать собственный сервер и фронтенд. Слабая сторона — закрытая экосистема, ограничения бесплатного тарифа, отсутствие 3D-визуализации, невозможность кастомизации внешнего вида под бренд проекта и слабая интеграция со специфическими алгоритмами наподобие двухосевого трекинга.'),
  p('Отдельно следует упомянуть онлайн-симуляторы вроде Wokwi и Tinkercad. Они отлично подходят для демонстрации работы прошивки, но никак не покрывают серверную и фронтенд-часть IoT-системы. Wokwi предоставляет визуализацию подключения и эмуляцию шины UART, но не имеет встроенных средств построения дашбордов или графиков из публикуемых устройством MQTT-сообщений.'),
);
content.push(h2('Сравнительный анализ решений'));
content.push(
  p('Для системного сравнения HELIOS v2.4 с существующими решениями была составлена сводная таблица, отражающая ключевые характеристики каждой категории.'),
);
content.push(makeTable({
  headers: ['Характеристика', 'Промышл. трекер', 'Самоделка ESP32', 'Облачная платформа', 'HELIOS v2.4'],
  widths: [28, 18, 18, 18, 18],
  rows: [
    ['Двухосевой трекинг', 'да', 'да', 'не реализует', 'да'],
    ['EMA-фильтрация LDR', 'да', 'редко', 'не относится', 'да (α=0.30)'],
    ['Ночной парк-режим', 'да', 'редко', 'не относится', 'да'],
    ['Открытый исходный код', 'нет', 'обычно да', 'частично', 'да'],
    ['Удалённая телеметрия', 'через SCADA', 'часто нет', 'да', 'MQTT + WS'],
    ['Двусторонние команды', 'да', 'редко', 'ограниченно', 'да (control)'],
    ['Real-time 3D-визуал.', 'нет', 'нет', 'нет', 'да (R3F)'],
    ['Цена внедрения', 'очень высокая', 'низкая', 'подписка', 'нулевая'],
    ['Возможность обучения', 'нулевая', 'средняя', 'низкая', 'высокая'],
  ],
}));
content.push(space(140));
content.push(
  p('Таблица наглядно показывает, что HELIOS v2.4 покрывает все ключевые требования к учебному IoT-проекту и одновременно обладает функциональностью, которой нет в коммерческих и облачных решениях, — фотореалистичной 3D-визуализацией состояния установки в реальном времени.'),
);
content.push(h2('Характеристики и преимущества разработанного приложения'));
content.push(
  p('HELIOS v2.4 объединяет в одном проекте три обычно разделяемые дисциплины: программирование микроконтроллеров на C++, серверную разработку на Bun/ElysiaJS и фронтенд на современном React-стеке. Это делает проект сильной отправной точкой для изучения архитектуры распределённых систем.'),
  p('Ключевые особенности приложения:'),
  bullet('Полная симуляция железа в Wokwi — нет необходимости в физическом ESP32, паяльнике или лабораторном источнике питания.'),
  bullet('Модульная прошивка: каждый функциональный блок (сенсоры, трекер, сеть, телеметрия) вынесен в отдельный файл .h/.cpp.'),
  bullet('Использование MQTT Last Will and Testament (LWT): при потере соединения брокер автоматически публикует {"online":false}, что мгновенно отражается в UI.'),
  bullet('Реалистичная 3D-сцена на react-three-fiber с PBR-материалами, динамическими тенями, процедурной травой, дневным небом drei <Sky> и постобработкой (Bloom, Vignette).'),
  bullet('Чёткое разделение «команды / телеметрия»: ESP32 → MQTT → backend → WebSocket → UI для измерений и UI → WS → backend → MQTT → ESP32 для управления.'),
  bullet('Все компоненты общаются стандартными протоколами, что позволяет заменять любой из них без переписывания остальных.'),
);

/* ────────────────── 2. TECHNOLOGIES ────────────────── */
content.push(h1('2. Анализ используемых технологий'));
content.push(h2('2.1 ESP32 и Arduino C++'));
content.push(
  p('Для роли «мозга» установки выбран микроконтроллер ESP32 — двухъядерный 32-битный SoC, разработанный компанией Espressif Systems. Он совмещает в одном корпусе вычислительное ядро Xtensa LX6, аппаратные периферийные контроллеры (АЦП, ШИМ, SPI, I²C, UART), а также встроенные радиомодули Wi-Fi и Bluetooth. Именно встроенный Wi-Fi делает ESP32 оптимальным выбором для IoT-проекта, требующего подключения к публичной сети.'),
  p('Прошивка написана на C++ в среде Arduino. Этот выбор обусловлен богатой экосистемой готовых библиотек: ESP32Servo для работы с сервоприводами без блокирования основного цикла, PubSubClient для лёгкой реализации MQTT-клиента и ArduinoJson 7 для сериализации/десериализации сообщений. Все три библиотеки имеют десятки тысяч установок и считаются де-факто стандартом сообщества.'),
  p('При работе с ESP32 необходимо учитывать особенности конкретной версии Arduino-core. В версии 3.x была переработана работа с PWM-каналами: вместо устаревшей пары ledcSetup + ledcAttachPin теперь используется единая функция ledcAttach(pin, freq, bits), а запись значения выполняется через ledcWrite(pin, value), привязанную не к каналу, а к самому пину. В прошивке HELIOS используется именно этот современный API.'),
);
content.push(h2('2.2 Симулятор Wokwi и проектирование схемы'));
content.push(
  p('Wokwi — это онлайн-симулятор встраиваемых устройств, поддерживающий ESP32, Arduino Uno/Mega, Raspberry Pi Pico и десятки других плат. Симулятор работает напрямую в браузере, использует ту же прошивку (.bin), что и реальная плата, и эмулирует периферию с физической точностью, достаточной для большинства учебных и прототипных задач.'),
  p('Схема устройства описана в файле diagram.json и включает 5 потенциометров (имитируют 4 LDR и датчик напряжения солнечной панели), 2 сервопривода и индикаторный светодиод с токоограничивающим резистором 220 Ом. Wokwi позволяет менять значения потенциометров мышью в реальном времени, что соответствует изменению освещённости в реальных условиях.'),
  p('Для локального запуска симуляции используется официальный wokwi-cli, требующий лишь CI-токена с wokwi.com. Это позволяет запускать симуляцию в фоне как обычный процесс операционной системы, в то время как браузерная вкладка остаётся свободной для отображения веб-интерфейса дашборда.'),
);
content.push(h2('2.3 Протокол MQTT и публичный брокер'));
content.push(
  p('Для передачи телеметрии и команд управления выбран протокол MQTT — лёгкий публикуй-подписочный протокол, разработанный специально для IoT и сценариев с ограниченной пропускной способностью. MQTT работает поверх TCP и предусматривает три уровня гарантии доставки (QoS 0/1/2), а также механизм «последней воли» (Last Will and Testament).'),
  p('В качестве брокера используется публичный сервер broker.hivemq.com:1883, не требующий регистрации или авторизации, что упрощает запуск проекта для других студентов. В производственной среде брокер должен быть приватным, с TLS и авторизацией по сертификатам, однако для образовательных и демонстрационных целей публичного брокера достаточно.'),
  p('Структура топиков и их назначение приведены в таблице ниже.'),
);
content.push(makeTable({
  headers: ['Топик', 'Кто публикует', 'Кто читает', 'Назначение'],
  widths: [30, 18, 18, 34],
  rows: [
    ['helios/helios-001/telemetry', 'ESP32',  'backend', 'JSON-снимок состояния каждые 500 мс'],
    ['helios/helios-001/status',    'ESP32',  'backend', 'online/offline, использует LWT'],
    ['helios/helios-001/control',   'backend','ESP32',   'команды управления (setMode/setServo/setDeadzone)'],
  ],
}));
content.push(space(140));
content.push(
  p('Использование LWT принципиально для надёжности системы: если соединение ESP32 с брокером оборвётся, брокер автоматически опубликует сообщение {"online":false} в топик status. Бэкенд получит его так же, как обычное MQTT-сообщение, и пометит устройство как офлайн в WebSocket-канале фронта.'),
);
content.push(h2('2.4 Серверная часть: Bun + ElysiaJS'));
content.push(
  p('Бэкенд выполнен на Bun — высокопроизводительной альтернативе Node.js, написанной на Zig с использованием движка JavaScriptCore. Bun сочетает в себе рантайм, сборщик, менеджер пакетов и тестовый раннер, что упрощает структуру проекта (нет необходимости в дополнительных webpack-конфигурациях).'),
  p('В качестве HTTP/WebSocket-фреймворка выбран ElysiaJS — современный фреймворк, спроектированный специально под Bun. Он использует TypeScript-типизацию на этапе компиляции для генерации валидаторов запросов и автоматической документации, что даёт сразу два важных преимущества: безопасность от некорректных входных данных и минимизация рантайм-проверок.'),
  p('Бэкенд выполняет три функции. Первая — поддерживать постоянное MQTT-соединение с broker.hivemq.com и форвардить все входящие сообщения (telemetry, status) в общий WebSocket-канал. Вторая — принимать команды от веб-клиентов через WebSocket и публиковать их в топик control. Третья — отдавать HTTP-endpoint /health и /api/snapshot для удобства отладки и интеграции с внешними мониторинговыми системами.'),
);
content.push(h2('2.5 Клиентская часть: React + Vite + Three.js'));
content.push(
  p('Веб-интерфейс построен на React 18 со сборщиком Vite. Vite предоставляет почти мгновенное обновление кода в режиме разработки (Hot Module Replacement через ESM), а также агрессивно оптимизированный продакшн-билд через Rollup. На фоне традиционной связки webpack + create-react-app переход на Vite даёт в разы более быстрый цикл разработки.'),
  p('Для 3D-сцены используется react-three-fiber — реактивная обёртка над three.js, позволяющая описывать сцену в декларативном JSX-синтаксисе. Вместе с библиотекой @react-three/drei (готовые хелперы: OrbitControls, ContactShadows, Sky, Cloud, Environment, Float) и @react-three/postprocessing (Bloom, Vignette) это даёт возможность собрать сцену уровня Awwwards в десятки раз быстрее, чем на чистом three.js.'),
  p('Графики временных рядов (LDR-датчики, выходная мощность) построены на библиотеке Recharts. Иконки взяты из lucide-react. Утилитарная стилизация выполнена на Tailwind CSS — это даёт компактную и единообразную систему дизайна без необходимости писать собственные CSS-классы.'),
);
content.push(h2('2.6 Сборка и инструментарий разработчика'));
content.push(
  p('Сборка прошивки выполняется через arduino-cli версии 1.4.1 и ESP32-core 3.3.8. Все три библиотеки (ESP32Servo 3.2.0, PubSubClient 2.8, ArduinoJson 7.4.3) устанавливаются стандартной командой arduino-cli lib install. Полученный бинарный файл .bin загружается в Wokwi через wokwi.toml-манифест.'),
  p('Бэкенд и фронтенд запускаются автоматически через bat-скрипт start.bat в корне проекта: он устанавливает зависимости при первом запуске и поднимает оба процесса в отдельных окнах. Скрипт stop.bat завершает их по идентификатору порта (8787 и 5173). Таким образом, полный запуск стека на чистой машине требует только установки Bun и наличия CI-токена Wokwi.'),
);

/* ────────────────── 3. DESIGN ────────────────── */
content.push(h1('3. Проектирование и реализация системы'));
content.push(h2('3.1 Описание архитектуры и схемы функционирования'));
content.push(
  p('Архитектура HELIOS v2.4 следует классической трёхслойной модели для IoT-систем: устройство — шлюз — клиент. Каждый из трёх слоёв полностью независим, что позволяет тестировать и развивать его отдельно.'),
  p('Поток данных снизу вверх (телеметрия): прошивка ESP32 каждые 500 мс формирует JSON-документ со снимком состояния и публикует его в топик helios/helios-001/telemetry. Бэкенд, выполняющий роль MQTT-клиента, получает это сообщение и широковещательно отправляет всем подключённым WebSocket-клиентам. Фронтенд получает сообщение, добавляет его в кольцевой буфер истории и обновляет состояние трекера, графики и 3D-сцену.'),
  p('Поток данных сверху вниз (команды): пользователь нажимает кнопку или двигает слайдер в панели управления фронтенда. Фронт формирует команду в формате {"cmd":"setMode","value":"MANUAL"} и отправляет её по WebSocket. Бэкенд транслирует её в MQTT-сообщение в топик helios/helios-001/control. Прошивка получает сообщение в своём mqttCallback, парсит JSON и вызывает соответствующий метод трекера.'),
  p('Помимо двух потоков данных, в системе есть третий канал — статус устройства. Это специальный топик status с LWT: при подключении ESP32 публикует туда {"online":true} с флагом retain, при потере соединения брокер сам публикует {"online":false}. Бэкенд хранит последний статус и пересылает его новым WebSocket-клиентам в первом сообщении-снапшоте.'),
);
content.push(makeTable({
  headers: ['Слой', 'Технологии', 'Порт', 'Файлы'],
  widths: [22, 38, 14, 26],
  rows: [
    ['Firmware', 'C++, ESP32 core 3.x, ESP32Servo, PubSubClient, ArduinoJson 7', '—', 'firmware/*.ino, .h, .cpp'],
    ['Backend',  'Bun 1.3, ElysiaJS 1.4, mqtt 5.x', '8787', 'backend/src/index.ts, mqtt.ts'],
    ['Frontend', 'React 18, Vite 5, R3F 8, drei 9, Tailwind 3, Recharts 2', '5173', 'frontend/src/**'],
  ],
}));
content.push(space(160));
content.push(h2('3.2 Алгоритм работы программного обеспечения'));
content.push(
  p('Алгоритм трекинга реализован в модуле tracker.cpp. Его основная идея — двух-этапная: сначала из четырёх показаний LDR вычисляются дифференциалы по вертикали и горизонтали, затем по этим дифференциалам с учётом «мёртвой зоны» (deadzone) принимается решение о направлении и величине шага сервопривода.'),
  p('Перед расчётом дифференциалов сырые показания АЦП проходят через два этапа фильтрации: усреднение восьми последовательных выборок (ADC_SAMPLES = 8) и экспоненциальное скользящее среднее (EMA) с коэффициентом α = 0.30. Это устраняет шумы 12-битного АЦП ESP32 и не даёт сервоприводам «дрожать» при микроколебаниях освещённости.'),
  p('Дифференциалы вычисляются как разница средних показаний по парам LDR:'),
);
content.push(codeBlock(`Differentials sensorsComputeDifferentials(const SensorData& s) {
  Differentials diff;
  diff.vertical   = (s.tl + s.tr) / 2 - (s.bl + s.br) / 2;
  diff.horizontal = (s.tl + s.bl) / 2 - (s.tr + s.br) / 2;
  return diff;
}`, 'sensors.cpp · функция расчёта дифференциалов'));
content.push(space(140));
content.push(
  p('Если абсолютное значение дифференциала превышает deadzone (по умолчанию 50 единиц АЦП), целевое значение соответствующего сервопривода меняется на величину SERVO_STEP (по умолчанию 1°). Само движение в направлении цели выполняется отдельной функцией smoothMove(), которая каждые 30 мс приближает текущее положение к целевому ровно на 1°. Это даёт визуально плавное движение без рывков.'),
  p('Особое внимание уделено ночному режиму. Если все четыре LDR одновременно показывают значения ниже NIGHT_THRESHOLD = 200 (что соответствует полной темноте), трекер переходит в режим PARKED: панель возвращается в горизонтальное положение (азимут 90°, элевация 10°) и остаётся там, периодически проверяя освещённость каждую минуту.'),
);
content.push(h2('3.3 Описание программной реализации'));

content.push(h3('3.3.1 Прошивка (firmware)'));
content.push(
  p('Прошивка состоит из шести модулей. Файл sketch.ino содержит точки входа setup() и loop(); все остальные файлы — функциональные модули.'),
);
content.push(makeTable({
  headers: ['Модуль', 'Содержит', 'Зависит от'],
  widths: [25, 50, 25],
  rows: [
    ['config.h',      'константы: пины, пороги, тайминги, MQTT-параметры', '—'],
    ['sensors.{h,cpp}', 'чтение АЦП, EMA-фильтр, расчёт дифференциалов', 'config.h'],
    ['tracker.{h,cpp}', 'алгоритм трекинга, сервоприводы, LED-индикатор', 'sensors.h, config.h'],
    ['network.{h,cpp}', 'Wi-Fi + MQTT-клиент, LWT, реконнект', 'config.h'],
    ['telemetry.{h,cpp}', 'JSON-сериализация, парсер control-команд', 'sensors.h, tracker.h, network.h'],
    ['sketch.ino', 'инициализация, главный loop, расписание задач', 'все выше'],
  ],
}));
content.push(space(140));
content.push(p('Основной цикл прошивки выглядит так:'));
content.push(codeBlock(`void loop() {
  const unsigned long now = millis();

  networkLoop();
  if (now - lastLoopTick < LOOP_DELAY_MS) return;
  lastLoopTick = now;

  const SensorData    s    = sensorsRead();
  const Differentials diff = sensorsComputeDifferentials(s);
  trackerUpdate(s, diff);

  if (now - lastTelemetryTick >= TELEMETRY_PERIOD) {
    lastTelemetryTick = now;
    if (networkIsConnected()) {
      telemetryPublish(s, diff, trackerGetState());
    }
  }
}`, 'sketch.ino · главный цикл'));
content.push(space(140));
content.push(
  p('Цикл работает без блокирующих delay() — все операции временного характера выполняются через сравнение millis() с накопленными метками времени. Это позволяет одновременно поддерживать MQTT-соединение, читать сенсоры, двигать сервоприводы и публиковать телеметрию без потерь и задержек.'),
);

content.push(h3('3.3.2 Серверная часть'));
content.push(
  p('Бэкенд состоит всего из трёх TypeScript-файлов: index.ts (точка входа и WebSocket-сервер), mqtt.ts (MQTT-клиент и кэш последних значений), types.ts (общие типы данных, синхронизированные с фронтом). Минимализм здесь сознателен: всё лишнее (база данных, аутентификация, очереди) для учебного проекта избыточно.'),
  p('Ключевая часть mqtt.ts — установка соединения с публичным брокером и подписка на нужные топики:'),
);
content.push(codeBlock(`export function connectMqtt(handlers: Handlers) {
  client = mqtt.connect(\`mqtt://\${MQTT_HOST}:\${MQTT_PORT}\`, {
    clientId: \`helios-backend-\${Math.random().toString(16).slice(2)}\`,
    reconnectPeriod: 5000,
  });

  client.on('connect', () => {
    brokerConnected = true;
    handlers.onBrokerConnect(true);
    client!.subscribe([TOPIC_TELEMETRY, TOPIC_STATUS]);
  });

  client.on('message', (topic, buf) => {
    const payload = JSON.parse(buf.toString());
    if (topic === TOPIC_TELEMETRY) {
      latestTelemetry = payload;
      handlers.onTelemetry(payload);
    } else if (topic === TOPIC_STATUS) {
      latestStatus = payload;
      handlers.onStatus(payload);
    }
  });
}`, 'backend/src/mqtt.ts · подключение к брокеру и подписка'));
content.push(space(140));
content.push(
  p('Объект handlers передаётся из index.ts и содержит три колбэка, каждый из которых широковещательно отправляет данные в WebSocket. Таким образом, бэкенд не хранит состояние в каких-либо переменных уровня приложения — всё, что есть, это «последняя известная телеметрия», «последний статус» и список активных WebSocket-клиентов.'),
);

content.push(h3('3.3.3 Клиентская часть'));
content.push(
  p('Фронтенд организован по принципу feature-based: каждый компонент отвечает за свою зону интерфейса и получает только нужные ему данные через props. Корневой компонент App.tsx использует хук useHeliosSocket, который инкапсулирует логику подключения к WebSocket, разбор входящих сообщений и кольцевой буфер истории.'),
);
content.push(makeTable({
  headers: ['Компонент', 'Зона ответственности'],
  widths: [28, 72],
  rows: [
    ['Header',        'логотип, статус-бейджи WS / Broker / Device, время последнего фрейма'],
    ['SensorCards',   '4 LDR-датчика, ΔV, ΔH, Panel output, LED indicator'],
    ['Tracker3D',     '3D-сцена react-three-fiber с панелью, солнцем и небом'],
    ['Charts',        'графики LDR-датчиков и выходной мощности (Recharts)'],
    ['ControlPanel',  'переключатель режима AUTO/MANUAL/PARKED, слайдеры az/el, deadzone'],
    ['EmptyState',    'экран ожидания первой телеметрии'],
  ],
}));
content.push(space(140));
content.push(
  p('Главный визуальный элемент — компонент Tracker3D. Внутри Canvas от react-three-fiber собрана сцена из следующих частей: дневное небо drei <Sky> с заданным sunPosition, направленный свет от того же положения солнца, ContactShadows для мягкой тени под трекером, процедурная травянистая поверхность (canvas-текстура зелёных оттенков + normal-map шум), сама модель трекера (основание, колонна, шарниры azimuth/elevation, солнечная панель с алюминиевой рамкой, тёмной подложкой, сеткой ячеек 6×4 и стеклянным покрытием) и многослойный солнечный диск с halo. Поверх Canvas нарисован HUD-оверлей: статус «tracking lock / aligning», текущие углы az/el и режим работы.'),
);

content.push(h3('3.3.4 Реализация двусторонней связи'));
content.push(
  p('WebSocket-канал на стороне фронта реализован в одном пользовательском хуке useHeliosSocket. Он подключается к ws://localhost:8787/ws, восстанавливает соединение через таймер при разрыве, разбирает входящие сообщения по полю type (snapshot, telemetry, status, broker) и предоставляет наружу единый объект состояния. Отправка команд выполняется одним методом sendCommand(cmd), который сериализует объект в JSON и отправляет его в открытый сокет.'),
  p('Формат команд, принимаемых прошивкой, описан в таблице.'),
);
content.push(makeTable({
  headers: ['Команда', 'Поля', 'Эффект'],
  widths: [22, 38, 40],
  rows: [
    ['setMode',     '{"value":"AUTO" | "MANUAL" | "PARKED"}', 'переключает режим работы трекера'],
    ['setServo',    '{"az":0..180, "el":10..170}',           'устанавливает целевые углы (только в MANUAL)'],
    ['setDeadzone', '{"value":0..2000}',                     'регулирует чувствительность алгоритма'],
  ],
}));
content.push(space(140));
content.push(p('Пример полного цикла команды (фронт → бэкенд → прошивка):'));
content.push(codeBlock(`// Фронтенд (TypeScript)
sendCommand({ cmd: 'setMode', value: 'MANUAL' });

// Бэкенд (TypeScript)
client.publish('helios/helios-001/control',
                JSON.stringify(msg), { qos: 0 });

// Прошивка (C++)
if (strcmp(cmd, "setMode") == 0) {
  const char* val = doc["value"];
  if (strcmp(val, "MANUAL") == 0) trackerSetMode(MODE_MANUAL);
}`, 'control flow: client → backend → firmware'));
content.push(space(140));
content.push(
  p('Такая трёхступенчатая цепочка гарантирует, что фронтенд никогда не общается с устройством напрямую: между ними всегда стоит проверяющий и логирующий шлюз. В будущем сюда легко добавить аутентификацию, журналирование и rate-limit, не меняя ни прошивку, ни UI.'),
);

/* ─────────── CONCLUSION ─────────── */
content.push(h1('Заключение'));
content.push(
  p('В рамках данного проекта была разработана полностью симулированная двухосевая система слежения за солнцем HELIOS v2.4. Реализация охватывает три независимых слоя: прошивку микроконтроллера ESP32, серверный шлюз на Bun + ElysiaJS и веб-интерфейс на React + Vite с 3D-сценой на react-three-fiber. Все три компонента работают по стандартным сетевым протоколам (MQTT и WebSocket), что делает систему открытой к расширению и замене любой из её частей.'),
  p('Алгоритм трекинга реализован в виде модульной прошивки с грамотным разделением ответственности: сенсоры, трекер, сеть и телеметрия вынесены в отдельные модули, что упрощает чтение кода и его расширение. Прошивка поддерживает плавное движение сервоприводов, фильтрацию показаний по экспоненциальной скользящей средней, мёртвую зону для устранения дрожания, а также автоматический ночной парковочный режим.'),
  p('Серверная часть выполняет роль моста между публичным MQTT-брокером и WebSocket-клиентами. Архитектура без базы данных намеренно упрощена: бэкенд хранит только последнюю известную телеметрию и статус устройства, что подходит для учебного и демонстрационного характера проекта, но при необходимости легко расширяется до полноценного хранения истории и аналитики.'),
  p('Фронтенд представляет собой современный интерактивный дашборд с фотореалистичной 3D-визуализацией. Использование PBR-материалов, динамических теней, дневного неба, процедурной травы и постобработки выводит визуальный уровень дашборда на качественно новый уровень по сравнению со стандартными решениями вроде Blynk или ThingsBoard. Двусторонний канал управления позволяет не только наблюдать за состоянием устройства, но и активно вмешиваться в его работу.'),
  p('Проект имеет очевидную образовательную ценность. Он демонстрирует студенту техники, обычно изучаемые по отдельности: программирование микроконтроллеров, проектирование сетевых сервисов, разработку SPA-приложений и работу с современной 3D-графикой в браузере. Полностью симулированный характер проекта снимает аппаратные барьеры: для запуска достаточно бесплатных инструментов (Wokwi CLI, Bun, arduino-cli) и стандартного браузера.'),
  p('В качестве направлений дальнейшего развития можно выделить: переход на приватный MQTT-брокер с TLS и авторизацией, добавление журналирования телеметрии в TimescaleDB или Prometheus, интеграцию с реальным ESP32 и реальными LDR-сенсорами, расширение алгоритма трекинга на использование астрономических расчётов положения Солнца (астрономический трекинг вместо сенсорного), а также мобильное приложение на React Native, переиспользующее существующий WebSocket-протокол.'),
);

/* ─────────── BIBLIOGRAPHY ─────────── */
content.push(h1('Библиография'));
const bibItems = [
  'Espressif Systems. ESP32 Series Datasheet. — Espressif, 2024.',
  'Espressif Systems. arduino-esp32 Core, version 3.3.8. — github.com/espressif/arduino-esp32',
  'Wokwi Documentation. ESP32 Simulator and Wokwi CLI. — wokwi.com/docs',
  'OASIS. MQTT Version 5.0 Specification. — mqtt.org/mqtt-specification',
  'HiveMQ. Public MQTT broker (broker.hivemq.com). — hivemq.com/public-mqtt-broker',
  'Bun. Fast all-in-one JavaScript runtime. — bun.sh/docs',
  'ElysiaJS. Ergonomic web framework for Bun. — elysiajs.com',
  'O\'Leary N. PubSubClient — MQTT client library for Arduino. — pubsubclient.knolleary.net',
  'Blanchon B. ArduinoJson Library, version 7. — arduinojson.org',
  'Wilbert K. ESP32Servo Library. — github.com/madhephaestus/ESP32Servo',
  'Meta. React 18 Documentation. — react.dev',
  'Vite. Next-generation frontend tooling. — vitejs.dev',
  'Poimandres. react-three-fiber Documentation. — docs.pmnd.rs/react-three-fiber',
  'Poimandres. @react-three/drei helpers collection. — github.com/pmndrs/drei',
  'Poimandres. @react-three/postprocessing. — github.com/pmndrs/react-postprocessing',
  'three.js authors. JavaScript 3D Library. — threejs.org',
  'Tailwind Labs. Tailwind CSS v3 Documentation. — tailwindcss.com',
  'Recharts authors. Composable charting library. — recharts.org',
  'WHATWG. The WebSocket Protocol (RFC 6455). — datatracker.ietf.org/doc/html/rfc6455',
];
bibItems.forEach((item, i) => {
  content.push(new Paragraph({
    spacing: { line: 320, before: 0, after: 100 },
    indent: { left: 440, hanging: 440 },
    children: [new TextRun({ text: `${i + 1}. ${item}`, font: FONT, size: 24 })],
  }));
});

/* ─────────────────────────────────────────────────────────── */
/* DOCUMENT                                                   */
/* ─────────────────────────────────────────────────────────── */
const doc = new Document({
  creator: 'HELIOS v2.4 report generator',
  title:   'Raport Proiect de an — HELIOS v2.4',
  description: 'UTM FCIM, Curs anual',
  styles: {
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1',
        basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { bold: true, size: 32, font: FONT, color: C.ink },
        paragraph: { spacing: { before: 240, after: 200, line: 360 } },
      },
      {
        id: 'Heading2', name: 'Heading 2',
        basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { bold: true, size: 28, font: FONT, color: C.ink },
        paragraph: { spacing: { before: 220, after: 160, line: 360 } },
      },
      {
        id: 'Heading3', name: 'Heading 3',
        basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { bold: true, size: 26, font: FONT, color: C.ink },
        paragraph: { spacing: { before: 180, after: 140, line: 360 } },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          margin: {
            top:    convertInchesToTwip(1),
            right:  convertInchesToTwip(0.8),
            bottom: convertInchesToTwip(1),
            left:   convertInchesToTwip(1.2),
          },
          size: { width: 11906, height: 16838 }, // A4 in twips
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({
              text: 'HELIOS v2.4 · Proiect de an · UTM FCIM',
              font: FONT, size: 18, color: C.muted, italics: true,
            })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: '— ', font: FONT, size: 18, color: C.muted }),
              new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: C.muted }),
              new TextRun({ text: ' —', font: FONT, size: 18, color: C.muted }),
            ],
          })],
        }),
      },
      children: [...titlePage, ...toc, ...content],
    },
  ],
});

const outPath = 'C:\\Users\\olegt\\OneDrive\\Desktop\\project annual university\\Raport_HELIOS_v2.4.docx';
const buf = await Packer.toBuffer(doc);
await writeFile(outPath, buf);
console.log(`Generated: ${outPath} (${buf.length} bytes)`);
