// HELIOS v2.4 — защитная записка (Note de prezentare).
// Подробное описание запуска, схемы Wokwi и кода (firmware + backend).
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  PageBreak, Header, Footer, PageNumber, convertInchesToTwip,
  TableOfContents, ExternalHyperlink,
} from 'docx';
import { writeFile } from 'node:fs/promises';

const C = {
  ink: '111827', muted: '475569', rule: 'CBD5E1',
  panel: 'F3F4F6', panelBd: 'E2E8F0', accent: 'EA580C',
  thHdr: '1F2937', thAlt: 'F8FAFC',
  good: '047857', warn: '92400E',
};
const FONT = 'Times New Roman';
const MONO = 'Consolas';

const p = (text, opt = {}) => new Paragraph({
  spacing: { line: 360, before: 0, after: 120, ...opt.spacing },
  alignment: opt.align ?? AlignmentType.JUSTIFIED,
  indent: opt.indent ?? { firstLine: 720 },
  children: [new TextRun({ text, font: FONT, size: 24, ...opt.run })],
});

const plain = (text, opt = {}) => new Paragraph({
  spacing: { line: 360, before: 0, after: 80, ...opt.spacing },
  alignment: opt.align ?? AlignmentType.LEFT,
  indent: opt.indent ?? {},
  children: [new TextRun({ text, font: FONT, size: 24, ...opt.run })],
});

const h1 = (text, pageBreak = true) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  alignment: AlignmentType.LEFT,
  spacing: { before: 360, after: 240, line: 360 },
  children: [new TextRun({ text: text.toUpperCase(), bold: true, font: FONT, size: 32, color: C.ink })],
  pageBreakBefore: pageBreak,
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

const step = (n, text) => new Paragraph({
  spacing: { line: 320, before: 0, after: 60 },
  indent: { left: 720, hanging: 720 },
  children: [
    new TextRun({ text: `${n}. `, bold: true, font: FONT, size: 24, color: C.accent }),
    new TextRun({ text, font: FONT, size: 24 }),
  ],
});

const inline = (text) => new TextRun({ text, font: MONO, size: 22, color: C.ink, shading: { type: ShadingType.CLEAR, fill: C.panel } });

const space = (size = 100) => new Paragraph({ spacing: { before: 0, after: size }, children: [] });

function blankBorder() {
  return {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };
}

function codeBlock(code, lang = '') {
  const lines = code.replace(/\t/g, '  ').split('\n');
  const rows = lines.map((ln) => new TableRow({
    children: [new TableCell({
      width: { size: 100, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: C.panel },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.SINGLE, size: 24, color: C.accent },
        right: { style: BorderStyle.SINGLE, size: 4, color: C.panelBd },
      },
      margins: { top: 30, bottom: 30, left: 200, right: 200 },
      children: [new Paragraph({
        spacing: { line: 240, before: 0, after: 0 },
        children: [new TextRun({ text: ln || ' ', font: MONO, size: 18, color: C.ink })],
      })],
    })],
  }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [new TableCell({
          width: { size: 100, type: WidthType.PERCENTAGE },
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

function shell(code, label = 'powershell') {
  return codeBlock(code, label);
}

function makeTable({ headers, rows, widths }) {
  const borders = {
    top:    { style: BorderStyle.SINGLE, size: 4, color: C.rule },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: C.rule },
    left:   { style: BorderStyle.SINGLE, size: 4, color: C.rule },
    right:  { style: BorderStyle.SINGLE, size: 4, color: C.rule },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: C.rule },
    insideVertical:   { style: BorderStyle.SINGLE, size: 4, color: C.rule },
  };
  const hdrRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      width: { size: widths?.[i] ?? 100 / headers.length, type: WidthType.PERCENTAGE },
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
      width: { size: widths?.[ci] ?? 100 / headers.length, type: WidthType.PERCENTAGE },
      shading: idx % 2 === 1 ? { type: ShadingType.CLEAR, fill: C.thAlt } : undefined,
      margins: { top: 80, bottom: 80, left: 140, right: 140 },
      children: cell.split('\n').map((line) => new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { line: 280, before: 0, after: 0 },
        children: [
          // monospace for code-looking cells (start with > or contain ::)
          /^(GPIO|D\d|pin|\w+\.\w+|\/|TOPIC)/.test(line)
            ? new TextRun({ text: line, font: MONO, size: 20, color: C.ink })
            : new TextRun({ text: line, font: FONT, size: 22, color: C.ink }),
        ],
      })),
    })),
  }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders,
    rows: [hdrRow, ...bodyRows],
  });
}

/* ─────────────────────────────────────────────────────────── */
/* TITLE PAGE                                                  */
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
    children: [new TextRun({ text: 'Защитная записка', font: FONT, size: 52, bold: true })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: 360, after: 60 },
    children: [new TextRun({ text: 'к курсовому проекту', font: FONT, size: 32, italics: true })],
  }),
  space(280),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: 340, after: 200 },
    children: [new TextRun({
      text: 'Тема: HELIOS v2.4 — двухосевой солнечный трекер\nс реалтайм-телеметрией и 3D-веб-дашбордом',
      font: FONT, size: 28, bold: true,
    })],
  }),
  space(600),
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
  space(120),
  new Paragraph({
    spacing: { line: 360, after: 80 },
    children: [
      new TextRun({ text: 'Репозиторий: ', font: FONT, size: 24 }),
      new ExternalHyperlink({
        link: 'https://github.com/HamuevOleg/Helios_Solar_System',
        children: [new TextRun({
          text: 'github.com/HamuevOleg/Helios_Solar_System',
          font: MONO, size: 22, color: '1D4ED8', underline: {},
        })],
      }),
    ],
  }),
  new Paragraph({
    spacing: { line: 360, after: 80 },
    children: [
      new TextRun({ text: 'Wokwi-симуляция: ', font: FONT, size: 24 }),
      new ExternalHyperlink({
        link: 'https://wokwi.com/projects/464027932343711745',
        children: [new TextRun({
          text: 'wokwi.com/projects/464027932343711745',
          font: MONO, size: 22, color: '1D4ED8', underline: {},
        })],
      }),
    ],
  }),
  space(500),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: 360 },
    children: [new TextRun({ text: 'Chișinău 2026', font: FONT, size: 28, bold: true })],
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

/* ─────────────────────────────────────────────────────────── */
/* TOC                                                         */
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
  }),
  new Paragraph({ children: [new PageBreak()] }),
];

/* ─────────────────────────────────────────────────────────── */
/* CONTENT                                                     */
/* ─────────────────────────────────────────────────────────── */
const content = [];

/* ============== INTRO ============== */
content.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  alignment: AlignmentType.CENTER,
  spacing: { before: 0, after: 240, line: 360 },
  children: [new TextRun({ text: 'НАЗНАЧЕНИЕ ДОКУМЕНТА', bold: true, font: FONT, size: 32 })],
}));
content.push(
  p('Настоящий документ дополняет основной отчёт по курсовому проекту HELIOS v2.4 и предназначен для сопровождения публичной защиты работы. В отличие от отчёта, концентрирующегося на обосновании архитектурных и технологических решений, данная записка фокусируется на трёх практических аспектах:'),
  bullet('пошаговая инструкция запуска полного стека (firmware + backend + frontend) на чистой Windows-машине;'),
  bullet('доступ к работающей онлайн-симуляции Wokwi с описанием схемы устройства и её электрических подключений;'),
  bullet('детальный построчный разбор прошивки ESP32 с указанием конкретных мест, в которых формируются и принимаются сетевые запросы между микроконтроллером и серверной частью.'),
  p('Документ построен в порядке практического использования: сначала читатель учится запускать систему, затем наблюдает её в работе через Wokwi, и наконец погружается в код, чтобы понимать каждую строку прошивки и сетевого моста.'),
);

/* ===================================================== */
/*  1. ЗАПУСК ПРОЦЕССА                                   */
/* ===================================================== */
content.push(h1('1. Запуск процесса'));
content.push(
  p('HELIOS v2.4 — распределённое приложение, состоящее из трёх независимых процессов: симуляции ESP32 в Wokwi, HTTP/WebSocket-сервера на Bun + ElysiaJS и Vite-фронтенда на React. Чтобы корректно запустить полный стек, необходимо последовательно выполнить шаги, описанные ниже.'),
);

content.push(h2('1.1 Требования к окружению'));
content.push(
  p('Перед запуском проекта необходимо убедиться, что на машине установлены следующие компоненты. Минимально требуется ОС Windows 10/11 (проект также проверен на macOS и Linux при условии замены .bat-скриптов на эквивалентные shell-команды), процессор x86-64 и ~3 ГБ свободного места на диске для всех инструментов.'),
);
content.push(makeTable({
  headers: ['Компонент', 'Версия', 'Назначение'],
  widths: [25, 18, 57],
  rows: [
    ['Bun',          '1.3+',   'рантайм и пакетный менеджер для backend / frontend'],
    ['arduino-cli',  '1.4.1+', 'компиляция прошивки ESP32 в бинарный .bin'],
    ['ESP32 core',   '3.3.8',  'плата ESP32 для arduino-cli (ledcAttach API 3.x)'],
    ['wokwi-cli',    '0.26.1+','локальный запуск Wokwi-симуляции (требует CI-токен)'],
    ['Git',          '2.40+',  'клонирование репозитория'],
    ['Chrome/Firefox','любая свежая','просмотр веб-интерфейса на localhost:5173'],
  ],
}));
content.push(space(160));

content.push(h2('1.2 Клонирование репозитория'));
content.push(
  p('Исходный код проекта размещён в публичном репозитории GitHub. Для получения локальной копии необходимо открыть PowerShell и выполнить:'),
);
content.push(shell(
`git clone https://github.com/HamuevOleg/Helios_Solar_System.git
cd Helios_Solar_System`, 'powershell · клонирование'));
content.push(space(160));

content.push(h2('1.3 Получение Wokwi CI-токена'));
content.push(
  p('Локальный запуск Wokwi-симуляции выполняется через утилиту wokwi-cli, которая требует CI-токен, выпускаемый на сайте wokwi.com. Токен бесплатен и привязан к учётной записи разработчика. Алгоритм получения:'),
  step('1', 'открыть в браузере https://wokwi.com/dashboard/ci;'),
  step('2', 'авторизоваться через Google, GitHub или email;'),
  step('3', 'нажать кнопку «Create token», задать произвольное имя (например, HELIOS-defence);'),
  step('4', 'скопировать значение токена в безопасное место — повторно его посмотреть невозможно;'),
  step('5', 'установить переменную окружения WOKWI_CLI_TOKEN перед запуском симуляции.'),
);
content.push(shell(
`$env:WOKWI_CLI_TOKEN = "wok_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"`,
'powershell · экспорт токена для текущей сессии'));
content.push(space(160));

content.push(h2('1.4 Установка инструментария'));
content.push(
  p('Bun устанавливается одной командой PowerShell. После установки путь к исполняемому файлу bun.exe прописывается в %USERPROFILE%\\.bun\\bin и автоматически добавляется в PATH:'),
);
content.push(shell(
`powershell -c "irm bun.sh/install.ps1 | iex"
bun --version   # ожидается 1.3.x`, 'powershell · Bun'));
content.push(space(140));
content.push(
  p('arduino-cli можно установить через winget — официальный пакетный менеджер Windows:'),
);
content.push(shell(
`winget install ArduinoSA.CLI --accept-package-agreements --accept-source-agreements
arduino-cli config init --overwrite
arduino-cli config set board_manager.additional_urls \\
  "https://espressif.github.io/arduino-esp32/package_esp32_index.json"
arduino-cli core update-index
arduino-cli core install esp32:esp32@3.3.8
arduino-cli lib install "ESP32Servo" "PubSubClient" "ArduinoJson"`,
'powershell · arduino-cli + ESP32 core 3.3.8 + 3 библиотеки'));
content.push(space(140));
content.push(
  p('wokwi-cli — это standalone-бинарный файл, его удобно положить рядом с проектом и не добавлять в PATH:'),
);
content.push(shell(
`Invoke-WebRequest \\
  -Uri "https://github.com/wokwi/wokwi-cli/releases/download/v0.26.1/wokwi-cli-win-x64.exe" \\
  -OutFile "C:\\arduino\\wokwi-cli.exe"
& "C:\\arduino\\wokwi-cli.exe" --version`,
'powershell · wokwi-cli'));
content.push(space(160));

content.push(h2('1.5 Установка зависимостей проекта'));
content.push(
  p('Зависимости фронтенда и бэкенда устанавливаются через bun install. Корневой package.json содержит вспомогательный скрипт install:all, который проходит по всем подпапкам:'),
);
content.push(shell(
`bun install:all
# или вручную:
cd backend  && bun install
cd ../frontend && bun install`,
'powershell · установка npm-зависимостей'));
content.push(space(160));

content.push(h2('1.6 Сборка прошивки'));
content.push(
  p('Прошивка компилируется arduino-cli в обычный ESP32 .bin-файл. Важно: путь до папки sketch не должен содержать кириллицу — gcc, входящий в ESP32-core, не работает с не-ASCII символами. Поэтому скетч копируется во временную папку C:\\arduino\\sketch\\helios:'),
);
content.push(shell(
`# скопировать firmware/* во временную ASCII-папку и переименовать .ino в helios.ino
mkdir C:\\arduino\\sketch\\helios
copy firmware\\*  C:\\arduino\\sketch\\helios\\
ren  C:\\arduino\\sketch\\helios\\sketch.ino helios.ino

arduino-cli compile \\
  --fqbn esp32:esp32:esp32 \\
  --build-path C:\\arduino\\build \\
  C:\\arduino\\sketch\\helios`,
'powershell · сборка .bin'));
content.push(space(140));
content.push(
  p('Результат: C:\\arduino\\build\\helios.ino.bin (~ 950 КБ, 72 % flash). Рядом создаётся helios.ino.elf — необходим для wokwi-cli, чтобы понимать соответствие адресов символам прошивки.'),
);

content.push(h2('1.7 Запуск бэкенда и фронтенда'));
content.push(
  p('Бэкенд поднимается на порту 8787, фронтенд — на 5173. Обычно их запускают в отдельных терминалах:'),
);
content.push(shell(
`# терминал 1 — backend
cd backend
bun run dev
#  ╔════════════════════════════════════════════════╗
#  ║  HELIOS backend                                 ║
#  ║  http://localhost:8787                          ║
#  ║  ws://localhost:8787/ws                         ║
#  ║  device: helios-001                             ║
#  ╚════════════════════════════════════════════════╝

# терминал 2 — frontend
cd frontend
bun run dev
#  VITE v5.4.21  ready in 995 ms
#  ➜  Local:   http://localhost:5173/`,
'powershell · backend + frontend'));
content.push(space(160));

content.push(h2('1.8 Запуск симуляции Wokwi'));
content.push(
  p('Для локального запуска симуляции скетча в Wokwi-cli достаточно одной команды. Файл wokwi.toml уже находится в подпапке C:\\arduino\\sketch\\helios и указывает на собранный .bin/.elf:'),
);
content.push(shell(
`$env:WOKWI_CLI_TOKEN = "wok_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
& "C:\\arduino\\wokwi-cli.exe" --timeout 7200000 --timeout-exit-code 0 \\
    --serial-log-file C:\\arduino\\serial.log \\
    C:\\arduino\\sketch\\helios`,
'powershell · wokwi-cli'));
content.push(space(140));
content.push(
  p('В консоли появятся строки загрузки ESP32 (ROM-bootloader, SPI-flash boot), затем баннер прошивки и периодическая телеметрия каждые 2 секунды. Wokwi автоматически подключает симулированную сеть Wi-Fi Wokwi-GUEST, поэтому прошивка успешно достигает публичного MQTT-брокера broker.hivemq.com.'),
);

content.push(h2('1.9 Альтернатива: start.bat / stop.bat'));
content.push(
  p('Для удобства в корне репозитория лежат два .bat-файла. start.bat запускает backend и frontend в отдельных окнах cmd, выполнив при необходимости bun install. stop.bat завершает процессы, занимающие порты 8787 и 5173, через netstat + taskkill. Wokwi-cli они не запускают — симуляцию по-прежнему нужно поднять отдельной командой.'),
);
content.push(shell(
`# двойной клик в проводнике или из консоли:
.\\start.bat
# когда работа закончена:
.\\stop.bat`,
'powershell · быстрый старт через bat'));
content.push(space(160));

content.push(h2('1.10 Что должно отобразиться после запуска'));
content.push(
  p('При корректной работе всех трёх процессов поведение системы соответствует таблице ниже. Если какой-то из индикаторов не соответствует ожидаемому, следует начать диагностику с проверки соединения соответствующего слоя.'),
);
content.push(makeTable({
  headers: ['Индикатор', 'Где смотреть', 'Норма'],
  widths: [27, 38, 35],
  rows: [
    ['Wokwi serial log',    'окно wokwi-cli',                              '=== HELIOS v2.4 — full firmware online ==='],
    ['Wi-Fi подключение',   'serial log',                                  '[wifi] connected, IP=10.13.37.2'],
    ['MQTT подключение',    'serial log',                                  '[mqtt] connecting... OK'],
    ['Бэйдж WS LINK',       'http://localhost:5173, правый верхний угол',  'зелёный'],
    ['Бэйдж BROKER',        'там же',                                      'зелёный'],
    ['Бэйдж DEVICE',        'там же',                                      'зелёный'],
    ['Sensors блок',        'правая колонка UI',                           'значения 0..4095, обновляются ~2 раза/сек'],
    ['3D-сцена',            'центральная панель UI',                       'трекер с панелью, солнце, трава'],
  ],
}));

/* ===================================================== */
/*  2. WOKWI                                              */
/* ===================================================== */
content.push(h1('2. Где посмотреть работу и схема Wokwi'));

content.push(h2('2.1 Публичная ссылка на симуляцию'));
content.push(
  p('Полностью рабочая копия прошивки опубликована в открытом виде на сайте Wokwi. По указанной ссылке открывается интерактивный симулятор, в котором уже подключены все периферийные устройства и загружен последний бинарный файл прошивки. Достаточно нажать зелёную кнопку Play («Run the simulation») в левом верхнем углу — устройство начнёт работать в браузере без каких-либо локальных установок.'),
);
content.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 100, after: 100, line: 320 },
  children: [
    new ExternalHyperlink({
      link: 'https://wokwi.com/projects/464027932343711745',
      children: [new TextRun({
        text: 'https://wokwi.com/projects/464027932343711745',
        font: MONO, size: 24, color: '1D4ED8', bold: true, underline: {},
      })],
    }),
  ],
}));
content.push(
  p('В правом нижнем углу страницы Wokwi отображает виртуальный последовательный монитор Serial Monitor, который повторяет то же содержимое, что и serial.log при локальном запуске. Это удобно для демонстрации работы прошивки прямо во время защиты: можно крутить ползунки потенциометров и сразу видеть, как меняются дифференциалы и углы сервоприводов.'),
);

content.push(h2('2.2 Описание схемы устройства'));
content.push(
  p('Электрическая схема описана в декларативном JSON-формате в файле firmware/diagram.json. Wokwi автоматически рисует её визуально, а внутри хранит просто список деталей и проводных соединений. Состав схемы приведён в таблице.'),
);
content.push(makeTable({
  headers: ['Деталь', 'Кол-во', 'Назначение'],
  widths: [40, 12, 48],
  rows: [
    ['ESP32 DevKit-C v4',             '1', 'основной контроллер, выполняет прошивку'],
    ['Wokwi Potentiometer',           '5', '4 имитируют LDR-фотодатчики + 1 — напряжение солнечной панели'],
    ['Wokwi Servo (SG90)',            '2', 'азимут (горизонтальный поворот) и элевация (наклон)'],
    ['Wokwi LED (yellow)',            '1', 'индикатор точности трекинга (PWM-яркость)'],
    ['Wokwi Resistor 220 Ω',          '1', 'токоограничивающий для светодиода'],
  ],
}));
content.push(space(160));

content.push(h2('2.3 Подключение пинов ESP32'));
content.push(
  p('Все периферийные устройства подключены к ESP32 по схеме, описанной в config.h. Использованы только пины, поддерживающие нужные функции: для АЦП — порты с подключённым модулем ADC1 (GPIO 32–36 на DevKit-C v4), для ШИМ-сигнала серво — стандартные пины 25/26, для управления светодиодом — GPIO 27. Полный список соответствий приведён ниже.'),
);
content.push(makeTable({
  headers: ['Пин ESP32', 'Деталь', 'Функция'],
  widths: [22, 28, 50],
  rows: [
    ['GPIO 34', 'pot1 (LDR Top-Left)',     'аналоговый вход ADC1 ch.6, 12-bit'],
    ['GPIO 35', 'pot2 (LDR Top-Right)',    'аналоговый вход ADC1 ch.7'],
    ['GPIO 32', 'pot3 (LDR Bot-Left)',     'аналоговый вход ADC1 ch.4'],
    ['GPIO 33', 'pot4 (LDR Bot-Right)',    'аналоговый вход ADC1 ch.5'],
    ['GPIO 36', 'pot5 (Solar Voltage)',    'аналоговый вход ADC1 ch.0 (VP)'],
    ['GPIO 25', 'servoAz (азимут)',        'PWM, 50 Гц, диапазон 500..2400 μs'],
    ['GPIO 26', 'servoEl (элевация)',      'PWM, 50 Гц, диапазон 500..2400 μs'],
    ['GPIO 27', 'LED (через 220 Ω)',       'LEDC ШИМ, 5 кГц, 8-bit'],
    ['3V3 / GND','питание потенциометров', '—'],
    ['VIN',     'питание сервоприводов',   'симулированные 5 В'],
  ],
}));
content.push(space(160));

content.push(h2('2.4 Что можно наблюдать в симуляции'));
content.push(
  p('Wokwi предоставляет интерактивную модель устройства в реальном времени. На полотне симулятора видны все 5 потенциометров, два сервопривода и светодиод. При нажатии Play прошивка начинает работать так же, как на реальном ESP32:'),
  bullet('Сервоприводы плавно вращаются по углам азимута и элевации в зависимости от показаний LDR. При равномерной освещённости (все потенциометры в центре) дифференциалы близки к нулю, и сервоприводы остаются на месте.'),
  bullet('Если повернуть, например, верхние потенциометры в большее значение, чем нижние — алгоритм поймёт это как «больше света сверху» и поднимет элевацию. Аналогично для левых/правых пар по азимуту.'),
  bullet('Светодиод горит ярче, когда суммарная ошибка трекинга мала (близко к идеальной ориентации). По мере отклонения от цели его яркость постепенно гаснет.'),
  bullet('Если убрать освещённость во всех четырёх LDR ниже порога NIGHT_THRESHOLD = 200, трекер автоматически переходит в режим PARKED — панель опускается в горизонтальное положение.'),
);
content.push(
  p('Параллельно с визуализацией Wokwi выводит в Serial Monitor строку состояния каждые 2 секунды. Это удобно для демонстрации логики прошивки на защите, поскольку показывает все ключевые внутренние переменные за один взгляд:'),
);
content.push(codeBlock(
`[ONLINE |AUTO] LDR=1949/2202/1855/1938  dV= +91 dH= -63  az= 53 el= 22  LED=246 DZ=50 SV=1997
[ONLINE |AUTO] LDR=2095/2103/2072/2005  dV= +61 dH= +29  az= 65 el= 23  LED=250 DZ=50 SV=1946
[ONLINE |AUTO] LDR=2247/2060/1964/2093  dV=+125 dH= +29  az= 18 el= 15  LED=246 DZ=50 SV=1944`,
'serial monitor · пример строки состояния'));
content.push(space(140));
content.push(
  p('Поля строки означают: статус соединения, режим трекера, текущие фильтрованные значения четырёх LDR, дифференциалы vertical / horizontal, текущие углы сервоприводов az/el, яркость индикаторного LED, текущая deadzone и значение солнечного напряжения. Эта же информация в формате JSON отправляется по MQTT в брокер каждые 500 мс.'),
);

content.push(h2('2.5 Локальный запуск (вне браузера)'));
content.push(
  p('Помимо публичной онлайн-симуляции, проект можно запускать и локально через wokwi-cli, как описано в разделе 1.8. Это даёт несколько преимуществ для разработки: возможность писать собственные сценарии тестирования (через флаг --scenario), запись serial-лога в файл, программный анализ работы прошивки и интеграцию с CI-системами. Для демонстрации работы во время защиты онлайн-вариант предпочтительнее, так как не требует наличия токена и зависимостей у проверяющего.'),
);

/* ===================================================== */
/*  3. ЗАЩИТА КОДА                                       */
/* ===================================================== */
content.push(h1('3. Защита кода'));

content.push(h2('3.1 Структура прошивки'));
content.push(
  p('Прошивка организована по принципу единой ответственности: каждый файл отвечает за одну подсистему. Главный .ino-файл является «оркестратором» — он лишь инициализирует модули и периодически вызывает их функции. Никакая бизнес-логика в нём не пишется. Карта модулей приведена в таблице.'),
);
content.push(makeTable({
  headers: ['Файл', 'Назначение', 'Зависит от'],
  widths: [22, 53, 25],
  rows: [
    ['sketch.ino',       'точка входа, setup / loop, оркестрация модулей',      'все ниже'],
    ['config.h',         'константы: пины, тайминги, пороги, Wi-Fi, MQTT',      '—'],
    ['sensors.h/.cpp',   'чтение ADC, EMA-фильтр, расчёт дифференциалов',       'config.h'],
    ['tracker.h/.cpp',   'алгоритм слежения, сервоприводы, LED, режимы',        'sensors.h, config.h'],
    ['network.h/.cpp',   'Wi-Fi, MQTT-клиент, LWT, callback, реконнект',        'config.h'],
    ['telemetry.h/.cpp', 'JSON-сериализация телеметрии, парсер команд',         'sensors, tracker, network'],
  ],
}));
content.push(space(160));

/* ---- 3.2 sketch.ino ---- */
content.push(h2('3.2 sketch.ino — точка входа и главный цикл'));
content.push(
  p('Файл sketch.ino содержит две функции, обязательные для всех Arduino-программ: setup() выполняется один раз при включении устройства, loop() вызывается бесконечно. В нашей реализации setup() инициализирует подсистемы в правильном порядке, а loop() работает по принципу «кооперативной многозадачности»: внутри одного итерационного цикла планируется выполнение нескольких задач с разной периодичностью, без использования RTOS-задач.'),
);
content.push(codeBlock(
`void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println(F("=== HELIOS v2.4 — full firmware online ==="));

  sensorsInit();                              // 1. ADC + начальные EMA
  trackerInit();                              // 2. серво, LED PWM
  telemetryInit();                            // 3. зарезервировано
  networkInit(telemetryHandleControl);        // 4. Wi-Fi + MQTT + callback
}`,
'firmware/sketch.ino · setup()'));
content.push(space(140));
content.push(
  p('Передача telemetryHandleControl в networkInit() — это инверсия зависимостей: модуль network ничего не знает о telemetry, но получает callback-функцию, которая будет вызвана при поступлении управляющей команды. Это позволяет в будущем заменить telemetry-модуль, не трогая network.'),
);
content.push(codeBlock(
`void loop() {
  const unsigned long now = millis();

  networkLoop();                              // обработка MQTT-loop

  if (now - lastLoopTick < LOOP_DELAY_MS) return;
  lastLoopTick = now;

  const SensorData    s    = sensorsRead();
  const Differentials diff = sensorsComputeDifferentials(s);
  trackerUpdate(s, diff);

  if (now - lastTelemetryTick >= TELEMETRY_PERIOD) {
    lastTelemetryTick = now;
    if (networkIsConnected()) {
      telemetryPublish(s, diff, trackerGetState());   // ← PUBLISH в MQTT
    }
  }

  if (now - lastSerialTick >= SERIAL_PERIOD) {
    lastSerialTick = now;
    Serial.printf("[%s|%s] LDR=... dV=... az=... ...\\n", ...);
  }
}`,
'firmware/sketch.ino · loop() (сокращённо)'));
content.push(space(140));
content.push(
  p('Ключевая идея — отсутствие блокирующих delay(). Все таймауты реализованы через сравнение текущего millis() с метками lastLoopTick / lastTelemetryTick / lastSerialTick. Это позволяет одновременно обслуживать MQTT-loop (требует частых вызовов networkLoop), читать сенсоры (100 мс), публиковать телеметрию (500 мс) и логировать в serial (2000 мс). Если бы где-то стоял delay(), MQTT-соединение быстро отвалилось бы по keep-alive timeout.'),
);

/* ---- 3.3 config.h ---- */
content.push(h2('3.3 config.h — централизованные настройки'));
content.push(
  p('Все «магические числа» прошивки вынесены в единый заголовочный файл config.h, чтобы их можно было изменить в одном месте, не пересобирая остальной код. Файл разбит на логические секции по комментариям.'),
);
content.push(codeBlock(
`// Pins
#define PIN_LDR_TL    34
#define PIN_LDR_TR    35
#define PIN_LDR_BL    32
#define PIN_LDR_BR    33
#define PIN_SOLAR_V   36
#define PIN_SERVO_AZ  25
#define PIN_SERVO_EL  26
#define PIN_LED_OUT   27

// Algorithm
#define DEADZONE          50       // мёртвая зона дифференциалов, 0..4095
#define SERVO_STEP        1        // шаг сервопривода в градусах
#define SERVO_SMOOTH_MS   30       // интервал плавного движения
#define NIGHT_THRESHOLD   200      // ниже = ночь
#define NIGHT_CHECK_MS    60000    // проверка ночи раз в минуту
#define LOOP_DELAY_MS     50       // период главного цикла
#define TELEMETRY_PERIOD  500      // период публикации в MQTT

// EMA
#define EMA_ALPHA         0.30f
#define ADC_SAMPLES       8

// Servo limits
#define AZ_MIN  0
#define AZ_MAX  180
#define EL_MIN  10
#define EL_MAX  170

// Park position
#define PARK_AZ   90
#define PARK_EL   EL_MIN

// LED PWM (Arduino-ESP32 core 3.x: pin-based API)
#define LED_PWM_CHANNEL  0
#define LED_PWM_FREQ     5000
#define LED_PWM_BITS     8

// Network
#define WIFI_SSID     "Wokwi-GUEST"
#define WIFI_PASS     ""
#define MQTT_HOST     "broker.hivemq.com"
#define MQTT_PORT     1883
#define DEVICE_ID     "helios-001"

// Topics
#define TOPIC_TELEMETRY  "helios/helios-001/telemetry"
#define TOPIC_CONTROL    "helios/helios-001/control"
#define TOPIC_STATUS     "helios/helios-001/status"`,
'firmware/config.h'));
content.push(space(160));
content.push(
  p('Особенно важно семейство «алгоритмических» констант: DEADZONE и SERVO_STEP вместе определяют чувствительность трекинга. Большая deadzone приводит к «спокойному» поведению (трекер игнорирует мелкие колебания), маленькая — к нервному. NIGHT_THRESHOLD выбран эмпирически по реальным показаниям LDR в темноте при питании 3.3 В.'),
);

/* ---- 3.4 sensors ---- */
content.push(h2('3.4 sensors.h / sensors.cpp — чтение АЦП и фильтрация'));
content.push(
  p('Этот модуль решает классическую проблему всех Arduino-проектов с фотодатчиками: показания LDR через 12-битный АЦП ESP32 имеют значительный шум, отчего сервоприводы дёргаются на месте. В HELIOS применяется двухэтапная фильтрация: усреднение 8 последовательных выборок (борьба с высокочастотным шумом) и экспоненциальное скользящее среднее EMA с α = 0.30 (борьба с низкочастотными скачками).'),
);
content.push(codeBlock(
`struct SensorData {
  int tl, tr, bl, br;   // 4 LDR (0..4095)
  int solarV;           // напряжение панели (0..4095)
};

struct Differentials {
  int vertical;     // >0  верхняя пара ярче нижней → поднять элевацию
  int horizontal;   // >0  левая пара ярче правой   → повернуть азимут влево
};

void sensorsInit();
SensorData sensorsRead();
Differentials sensorsComputeDifferentials(const SensorData& s);`,
'firmware/sensors.h · публичный API'));
content.push(space(140));
content.push(codeBlock(
`static int sampleAverage(int pin) {
  uint32_t sum = 0;
  for (int i = 0; i < ADC_SAMPLES; i++) {
    sum += analogRead(pin);
  }
  return (int)(sum / ADC_SAMPLES);
}

void sensorsInit() {
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_LDR_TL, ADC_11db);
  analogSetPinAttenuation(PIN_LDR_TR, ADC_11db);
  analogSetPinAttenuation(PIN_LDR_BL, ADC_11db);
  analogSetPinAttenuation(PIN_LDR_BR, ADC_11db);
  analogSetPinAttenuation(PIN_SOLAR_V, ADC_11db);

  emaTl = (float)sampleAverage(PIN_LDR_TL);   // прогрев фильтров
  emaTr = (float)sampleAverage(PIN_LDR_TR);
  emaBl = (float)sampleAverage(PIN_LDR_BL);
  emaBr = (float)sampleAverage(PIN_LDR_BR);
  emaSv = (float)sampleAverage(PIN_SOLAR_V);
}`,
'firmware/sensors.cpp · инициализация'));
content.push(space(140));
content.push(codeBlock(
`SensorData sensorsRead() {
  int rawTl = sampleAverage(PIN_LDR_TL);
  ...
  // EMA: новое = α*текущее + (1-α)*предыдущее
  emaTl = EMA_ALPHA * rawTl + (1.0f - EMA_ALPHA) * emaTl;
  emaTr = EMA_ALPHA * rawTr + (1.0f - EMA_ALPHA) * emaTr;
  emaBl = EMA_ALPHA * rawBl + (1.0f - EMA_ALPHA) * emaBl;
  emaBr = EMA_ALPHA * rawBr + (1.0f - EMA_ALPHA) * emaBr;
  emaSv = EMA_ALPHA * rawSv + (1.0f - EMA_ALPHA) * emaSv;

  SensorData d;
  d.tl = (int)emaTl;  d.tr = (int)emaTr;
  d.bl = (int)emaBl;  d.br = (int)emaBr;
  d.solarV = (int)emaSv;
  return d;
}

Differentials sensorsComputeDifferentials(const SensorData& s) {
  Differentials diff;
  diff.vertical   = (s.tl + s.tr) / 2 - (s.bl + s.br) / 2;
  diff.horizontal = (s.tl + s.bl) / 2 - (s.tr + s.br) / 2;
  return diff;
}`,
'firmware/sensors.cpp · чтение и дифференциалы'));
content.push(space(160));
content.push(
  p('Формула EMA в виде y[n] = α·x[n] + (1−α)·y[n−1] хорошо известна как однополюсный IIR-фильтр первого порядка. При α = 0.30 эффективная постоянная времени составляет τ ≈ 3 итерации (≈ 300 мс при частоте чтения 100 мс), что даёт хороший баланс между «гладкостью» и реактивностью.'),
);

/* ---- 3.5 tracker ---- */
content.push(h2('3.5 tracker.h / tracker.cpp — алгоритм трекинга'));
content.push(
  p('Tracker — ядро прошивки. Он принимает на вход отфильтрованные показания сенсоров с дифференциалами, обновляет внутреннее состояние, отдаёт команды сервоприводам и управляет LED-индикатором точности.'),
);
content.push(codeBlock(
`enum TrackerMode {
  MODE_AUTO    = 0,   // автоматическое слежение по LDR
  MODE_MANUAL  = 1,   // ручное управление через MQTT-команды
  MODE_PARKED  = 2    // ночной режим, панель в нейтральном положении
};

struct TrackerState {
  TrackerMode mode;
  int currentAz, currentEl;     // текущая позиция серво
  int targetAz,  targetEl;      // целевая позиция (куда стремимся)
  int ledBrightness;            // 0..255
  int deadzone;                 // изменяется через MQTT-команду
};

void trackerInit();
void trackerUpdate(const SensorData& s, const Differentials& diff);
TrackerState trackerGetState();

void trackerSetMode(TrackerMode mode);
void trackerSetManualTarget(int az, int el);
void trackerSetDeadzone(int dz);`,
'firmware/tracker.h · публичный API'));
content.push(space(140));
content.push(codeBlock(
`void trackerInit() {
  // ESP32 core 3.x: pin-based ledcAttach (без явного канала)
  ledcAttach(PIN_LED_OUT, LED_PWM_FREQ, LED_PWM_BITS);
  ledcWrite(PIN_LED_OUT, 0);

  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  servoAz.setPeriodHertz(50);
  servoEl.setPeriodHertz(50);
  servoAz.attach(PIN_SERVO_AZ, 500, 2400);  // SG90: 500–2400 μs
  servoEl.attach(PIN_SERVO_EL, 500, 2400);

  state.currentAz = state.targetAz = PARK_AZ;
  state.currentEl = state.targetEl = PARK_EL;
  servoAz.write(state.currentAz);
  servoEl.write(state.currentEl);
}`,
'firmware/tracker.cpp · trackerInit()'));
content.push(space(140));
content.push(codeBlock(
`void trackerUpdate(const SensorData& s, const Differentials& diff) {
  if (state.mode == MODE_MANUAL) {
    state.ledBrightness = 0;
    ledcWrite(PIN_LED_OUT, 0);
    smoothMove();                          // только плавно тянемся к target
    return;
  }

  if (state.mode == MODE_PARKED) {
    if (millis() - lastNightCheck > NIGHT_CHECK_MS) {
      lastNightCheck = millis();
      if (!isNight(s)) state.mode = MODE_AUTO;  // рассвет → авто
    }
    state.ledBrightness = 0;
    ledcWrite(PIN_LED_OUT, 0);
    smoothMove();
    return;
  }

  // MODE_AUTO:
  if (isNight(s)) {
    state.mode = MODE_PARKED;
    state.targetAz = PARK_AZ;
    state.targetEl = PARK_EL;
    lastNightCheck = millis();
    return;
  }

  // если ошибка по вертикали выше deadzone — двинуть цель элевации
  if (abs(diff.vertical) > state.deadzone) {
    if (diff.vertical > 0 && state.targetEl < EL_MAX) state.targetEl += SERVO_STEP;
    else if (diff.vertical < 0 && state.targetEl > EL_MIN) state.targetEl -= SERVO_STEP;
  }
  // аналогично по горизонтали
  if (abs(diff.horizontal) > state.deadzone) {
    if (diff.horizontal > 0 && state.targetAz > AZ_MIN) state.targetAz -= SERVO_STEP;
    else if (diff.horizontal < 0 && state.targetAz < AZ_MAX) state.targetAz += SERVO_STEP;
  }

  smoothMove();
  updateLedIndicator(diff);
}`,
'firmware/tracker.cpp · trackerUpdate() — ядро алгоритма'));
content.push(space(140));
content.push(codeBlock(
`static void smoothMove() {
  if (millis() - lastSmoothMove < SERVO_SMOOTH_MS) return;
  lastSmoothMove = millis();

  if (state.currentAz < state.targetAz) state.currentAz++;
  else if (state.currentAz > state.targetAz) state.currentAz--;

  if (state.currentEl < state.targetEl) state.currentEl++;
  else if (state.currentEl > state.targetEl) state.currentEl--;

  servoAz.write(state.currentAz);
  servoEl.write(state.currentEl);
}`,
'firmware/tracker.cpp · плавное движение серво'));
content.push(space(140));
content.push(
  p('Функция smoothMove() важна не только эстетически: резкие скачки на 5–10 градусов привели бы к большому пусковому току сервопривода, что в реальной установке могло бы посадить блок питания. В симуляции это незаметно, но привычка писать корректный код переносится в реальный мир без переписывания.'),
);

/* ---- 3.6 network ---- */
content.push(h2('3.6 network.h / network.cpp — Wi-Fi и MQTT'));
content.push(
  p('Этот модуль инкапсулирует всю сетевую часть прошивки. Он подключается к Wi-Fi-точке Wokwi-GUEST, поддерживает MQTT-соединение с публичным брокером HiveMQ, переподключается при разрыве, публикует Last Will and Testament при подключении и передаёт принятые сообщения «выше» через callback.'),
);
content.push(codeBlock(
`using ControlHandler = std::function<void(const String& payload)>;

void networkInit(ControlHandler onControl);
void networkLoop();
bool networkIsConnected();
bool networkPublish(const char* topic, const char* payload, bool retain = false);
bool networkPublish(const char* topic, const String& payload, bool retain = false);`,
'firmware/network.h · публичный API'));
content.push(space(140));
content.push(codeBlock(
`static bool connectMqtt() {
  Serial.print(F("[mqtt] connecting... "));
  const char* willTopic   = TOPIC_STATUS;
  const char* willPayload = "{\\"online\\":false}";
  if (mqtt.connect(DEVICE_ID, NULL, NULL,
                   willTopic, 0, true, willPayload)) {
    Serial.println(F("OK"));
    mqtt.publish(TOPIC_STATUS, "{\\"online\\":true}", true);  // retained
    mqtt.subscribe(TOPIC_CONTROL);                              // подписка
    return true;
  }
  Serial.printf("FAIL rc=%d\\n", mqtt.state());
  return false;
}`,
'firmware/network.cpp · connectMqtt() с LWT'));
content.push(space(140));
content.push(
  p('Ключевой момент здесь — Last Will and Testament. Параметры willTopic, willPayload, willRetain = true в mqtt.connect() говорят брокеру: «если я внезапно пропаду, опубликуй за меня это сообщение». Таким образом, при разрыве соединения брокер автоматически опубликует {"online":false} в helios/helios-001/status, и подписанный на этот топик бэкенд мгновенно увидит, что устройство недоступно — без необходимости в собственных таймаутах.'),
);
content.push(codeBlock(
`static void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;
  msg.reserve(length);
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.printf("[mqtt] RX %s: %s\\n", topic, msg.c_str());
  if (controlHandler) controlHandler(msg);    // ← вызов telemetryHandleControl
}

void networkLoop() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (!mqtt.connected()) {
    const unsigned long now = millis();
    if (now - lastReconnectAttempt > RECONNECT_INTERVAL_MS) {
      lastReconnectAttempt = now;
      connectMqtt();
    }
    return;
  }
  mqtt.loop();                                 // обработка входящих сообщений
}`,
'firmware/network.cpp · приём команд и реконнект'));
content.push(space(140));
content.push(codeBlock(
`bool networkPublish(const char* topic, const char* payload, bool retain) {
  if (!mqtt.connected()) return false;
  return mqtt.publish(topic, payload, retain);
}`,
'firmware/network.cpp · публикация'));
content.push(space(160));

/* ---- 3.7 telemetry ---- */
content.push(h2('3.7 telemetry.h / telemetry.cpp — JSON и парсер команд'));
content.push(
  p('Telemetry-модуль выполняет две функции, симметричные по отношению друг к другу: исходящая телеметрия (формирование JSON-объекта и публикация в брокер) и входящие команды (приём JSON, валидация полей, вызов соответствующего метода трекера).'),
);
content.push(codeBlock(
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
  servo["az"]       = st.currentAz;  servo["el"]       = st.currentEl;
  servo["targetAz"] = st.targetAz;   servo["targetEl"] = st.targetEl;

  JsonObject power = doc["power"].to<JsonObject>();
  power["voltage"]       = (s.solarV / 4095.0f) * 5.0f;
  power["ledBrightness"] = st.ledBrightness;
  power["raw"]           = s.solarV;

  doc["deadzone"] = st.deadzone;

  String json;
  serializeJson(doc, json);
  networkPublish(TOPIC_TELEMETRY, json);        // ← ВЫЗОВ В СЕТЬ
}`,
'firmware/telemetry.cpp · сериализация и публикация'));
content.push(space(140));
content.push(codeBlock(
`void telemetryHandleControl(const String& payload) {
  JsonDocument doc;
  const DeserializationError err = deserializeJson(doc, payload);
  if (err) {
    Serial.printf("[control] JSON parse error: %s\\n", err.c_str());
    return;
  }

  const char* cmd = doc["cmd"];
  if (!cmd) { Serial.println(F("[control] missing 'cmd'")); return; }

  if (strcmp(cmd, "setMode") == 0) {
    const char* val = doc["value"];
    if      (strcmp(val, "AUTO")   == 0) trackerSetMode(MODE_AUTO);
    else if (strcmp(val, "MANUAL") == 0) trackerSetMode(MODE_MANUAL);
    else if (strcmp(val, "PARKED") == 0) trackerSetMode(MODE_PARKED);
  }
  else if (strcmp(cmd, "setServo") == 0) {
    const TrackerState st = trackerGetState();
    int az = doc["az"] | st.targetAz;
    int el = doc["el"] | st.targetEl;
    trackerSetManualTarget(az, el);
  }
  else if (strcmp(cmd, "setDeadzone") == 0) {
    int dz = doc["value"] | -1;
    if (dz >= 0) trackerSetDeadzone(dz);
  }
}`,
'firmware/telemetry.cpp · парсер входящих команд'));
content.push(space(160));

/* ============== ЗАПРОСЫ НА БЭКЕНД ============== */
content.push(h2('3.8 Где идут запросы на бэкенд (publish из прошивки)'));
content.push(
  p('Под «запросами на бэкенд» в IoT-системах с MQTT принято понимать публикации сообщений в брокер: устройство не делает HTTP-вызовы непосредственно к серверу, а лишь оставляет данные в брокере, откуда их забирает подписанный бэкенд. В HELIOS существует три точки, из которых прошивка отправляет сообщения наружу.'),
);
content.push(makeTable({
  headers: ['№', 'Файл · функция', 'Топик', 'Когда вызывается'],
  widths: [6, 33, 33, 28],
  rows: [
    ['1', 'firmware/network.cpp · connectMqtt()',     'helios/helios-001/status',    'при подключении: {"online":true}'],
    ['2', 'firmware/network.cpp · LWT (mqtt.connect)','helios/helios-001/status',    'автоматически брокером при разрыве'],
    ['3', 'firmware/telemetry.cpp · telemetryPublish()','helios/helios-001/telemetry','каждые 500 мс из loop()'],
  ],
}));
content.push(space(140));
content.push(
  p('Цепочка вызовов, по которой данные доходят от датчиков до отправки в брокер:'),
);
content.push(codeBlock(
`loop()                              // sketch.ino
  └─> telemetryPublish(s,diff,st)   // telemetry.cpp
        ├─> serializeJson(doc, json)            // ArduinoJson 7
        └─> networkPublish(TOPIC_TELEMETRY,json)// network.cpp
              └─> mqtt.publish(topic, payload, retain)  // PubSubClient
                    └─> TCP → broker.hivemq.com:1883
                          └─> [подписан backend] ←──────┘`,
'путь данных firmware → MQTT-брокер'));
content.push(space(140));
content.push(
  p('Если разбирать защиту с точки зрения «где конкретно мой код взаимодействует с бэкендом», правильный ответ — нигде напрямую. Прошивка вообще не знает о существовании сервера на 8787 порту. Она работает по принципу «слепой публикации» в брокер, а уже бэкенд, подписанный на нужные топики, превращает MQTT-сообщения в WebSocket-широковещание для веб-клиентов. Эта развязка через брокер — ключевое архитектурное решение, повышающее модульность и надёжность.'),
);

content.push(h2('3.9 Где в бэкенде принимаются эти запросы'));
content.push(
  p('Бэкенд состоит из трёх TypeScript-файлов: index.ts (Elysia-приложение и WebSocket-сервер), mqtt.ts (MQTT-клиент и кеш последних сообщений), types.ts (общие типы). Точка приёма всех публикаций прошивки находится в mqtt.ts, в одном обработчике client.on(\'message\', ...).'),
);
content.push(codeBlock(
`// backend/src/mqtt.ts
const TOPIC_TELEMETRY = \`helios/\${DEVICE_ID}/telemetry\`;
const TOPIC_STATUS    = \`helios/\${DEVICE_ID}/status\`;
const TOPIC_CONTROL   = \`helios/\${DEVICE_ID}/control\`;

export function connectMqtt(events: MqttBridgeEvents): void {
  const clientId = \`helios-backend-\${Math.random().toString(16).slice(2, 10)}\`;
  client = mqtt.connect(\`mqtt://\${HOST}:\${PORT}\`, {
    clientId, clean: true,
    reconnectPeriod: 2000, connectTimeout: 10_000,
  });

  client.on('connect', () => {
    brokerConnected = true;
    console.log(\`[mqtt] connected to \${HOST}\`);
    client?.subscribe([TOPIC_TELEMETRY, TOPIC_STATUS], { qos: 0 });  // ← ПОДПИСКА
    events.onBrokerConnect(true);
  });

  client.on('message', (topic, payload) => {                          // ← ПРИЁМ
    let json: unknown;
    try { json = JSON.parse(payload.toString('utf-8')); }
    catch (e) { console.error('[mqtt] bad JSON on', topic, ':', e); return; }

    if (topic === TOPIC_TELEMETRY) {
      latestTelemetry = json as Telemetry;
      events.onTelemetry(latestTelemetry);   // → broadcast в WS
    } else if (topic === TOPIC_STATUS) {
      latestStatus = json as DeviceStatus;
      events.onStatus(latestStatus);         // → broadcast в WS
    }
  });
}`,
'backend/src/mqtt.ts · подписка и обработчик сообщений'));
content.push(space(140));
content.push(
  p('Обработчик client.on(\'message\') принимает все сообщения от двух топиков (telemetry и status), парсит JSON и через объект events передаёт распарсенные данные «наверх» — в Elysia-приложение, которое затем рассылает их всем подключённым WebSocket-клиентам:'),
);
content.push(codeBlock(
`// backend/src/index.ts
const wsClients = new Set<WsClient>();

function broadcast(msg: ServerToClient): void {
  const text = JSON.stringify(msg);
  for (const client of wsClients) {
    try { client.send(text); }
    catch { /* close сработает следом */ }
  }
}

// Поднимаем MQTT-мост и форвардим всё в broadcast
connectMqtt({
  onTelemetry: (data) => broadcast({ type: 'telemetry', data }),  // ← сюда уходит телеметрия
  onStatus:    (data) => broadcast({ type: 'status',    data }),
  onBrokerConnect: (connected) => broadcast({ type: 'broker', connected }),
});`,
'backend/src/index.ts · форвард MQTT → WebSocket'));
content.push(space(140));
content.push(
  p('Таким образом, ровно один файл и две функции (connectMqtt + broadcast) являются «точкой приёма запросов от прошивки». Любое нарушение протокола (испорченный JSON, неизвестный топик) приводит к записи в console.error и не валит сервер — это умышленно: брокер публичный, и от него теоретически могут приходить мусорные сообщения.'),
);

content.push(h2('3.10 Обратный путь: команды от фронтенда к прошивке'));
content.push(
  p('Аналогично прямому потоку телеметрии, в системе есть обратный поток: пользователь в браузере нажимает кнопку → команда уходит через WebSocket на бэкенд → бэкенд публикует её в MQTT-топик control → прошивка получает её в своём mqttCallback и применяет.'),
);
content.push(codeBlock(
`// frontend/src/hooks/useHeliosSocket.ts
const sendCommand = useCallback((cmd: ClientToServer) => {
  const ws = wsRef.current;
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(cmd));                       // ← фронт → backend
}, []);`,
'frontend → backend (WebSocket)'));
content.push(space(120));
content.push(codeBlock(
`// backend/src/index.ts (WebSocket handler внутри Elysia)
.ws('/ws', {
  body: t.Any(),
  message(_ws, raw) {
    let cmd: ClientToServer;
    try { cmd = typeof raw === 'string' ? JSON.parse(raw) : raw as ClientToServer; }
    catch (e) { console.error('[ws] invalid JSON:', e); return; }
    publishControl(cmd);                              // ← backend → MQTT
  },
})`,
'backend/src/index.ts · приём команд от фронта'));
content.push(space(120));
content.push(codeBlock(
`// backend/src/mqtt.ts
export function publishControl(cmd: ClientToServer): boolean {
  if (!client || !brokerConnected) return false;
  const payload = JSON.stringify(cmd);
  client.publish(TOPIC_CONTROL, payload, { qos: 0, retain: false });
  console.log('[mqtt] TX', TOPIC_CONTROL, payload);
  return true;
}`,
'backend/src/mqtt.ts · публикация команды в брокер'));
content.push(space(120));
content.push(codeBlock(
`// firmware/network.cpp
static void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;  for (...) msg += (char)payload[i];
  if (controlHandler) controlHandler(msg);            // ← MQTT → telemetry.cpp
}

// firmware/telemetry.cpp
void telemetryHandleControl(const String& payload) {
  JsonDocument doc;
  deserializeJson(doc, payload);
  const char* cmd = doc["cmd"];
  if (strcmp(cmd, "setMode") == 0) trackerSetMode(...);    // ← применение
  else if (strcmp(cmd, "setServo") == 0) trackerSetManualTarget(...);
  else if (strcmp(cmd, "setDeadzone") == 0) trackerSetDeadzone(...);
}`,
'firmware · приём команды и вызов trackerSet***'));
content.push(space(160));
content.push(
  p('Полный путь одной команды (пример: пользователь нажал кнопку «MANUAL» в UI):'),
);
content.push(makeTable({
  headers: ['Шаг', 'Слой', 'Файл · функция', 'Действие'],
  widths: [6, 18, 36, 40],
  rows: [
    ['1', 'frontend',  'ControlPanel.tsx · onClick',                 'вызов sendCommand({cmd:"setMode",value:"MANUAL"})'],
    ['2', 'frontend',  'useHeliosSocket.ts · sendCommand()',         'ws.send(JSON)'],
    ['3', 'backend',   'index.ts · ws message handler',              'JSON.parse → publishControl(cmd)'],
    ['4', 'backend',   'mqtt.ts · publishControl()',                 'client.publish(TOPIC_CONTROL, ...)'],
    ['5', 'broker',    'broker.hivemq.com:1883',                      'передача всем подписчикам'],
    ['6', 'firmware',  'network.cpp · mqttCallback()',               'controlHandler(msg)'],
    ['7', 'firmware',  'telemetry.cpp · telemetryHandleControl()',   'разбор JSON, вызов trackerSetMode'],
    ['8', 'firmware',  'tracker.cpp · trackerSetMode()',             'смена state.mode'],
  ],
}));
content.push(space(160));
content.push(
  p('Этот рисунок показывает основное преимущество выбранной архитектуры: каждый из четырёх слоёв (frontend, backend, broker, firmware) знает только о своём ближайшем соседе и не имеет жёстких ссылок на остальные. Замена любого слоя выполняется независимо — например, фронтенд на React можно заменить на мобильное приложение, бэкенд на Bun можно перенести на Node.js или Go, брокер HiveMQ можно заменить на Mosquitto в Docker, а ESP32 — на другой микроконтроллер с MQTT-стеком.'),
);

/* ============== CLOSING ============== */
content.push(h1('Заключение'));
content.push(
  p('Настоящая защитная записка проводит читателя по пути «от первого запуска до построчного понимания кода». В разделе 1 описано развёртывание полного стека на чистой Windows-машине, в разделе 2 — доступ к публичной онлайн-симуляции и понимание электрической схемы устройства, в разделе 3 — детальный разбор прошивки и точная локализация всех точек сетевого взаимодействия между микроконтроллером и серверной частью.'),
  p('Проект HELIOS v2.4 демонстрирует практическую реализацию полного цикла разработки IoT-системы: от программирования микроконтроллера на C++ до построения современного веб-интерфейса с реалистичной 3D-визуализацией. Архитектура с разделением на четыре слоя и общением через стандартные открытые протоколы (MQTT и WebSocket) делает систему расширяемой, тестируемой и пригодной к замене любой из её частей. Полностью симулированный характер исключает необходимость в физическом оборудовании и делает проект доступным для повторения и обучения.'),
);

/* ─────────── DOCUMENT ─────────── */
const doc = new Document({
  creator: 'HELIOS v2.4 defence note generator',
  title:   'Защитная записка — HELIOS v2.4',
  description: 'UTM FCIM, Curs anual — Note de prezentare',
  styles: {
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { bold: true, size: 32, font: FONT, color: C.ink },
        paragraph: { spacing: { before: 240, after: 200, line: 360 } },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { bold: true, size: 28, font: FONT, color: C.ink },
        paragraph: { spacing: { before: 220, after: 160, line: 360 } },
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
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
          size: { width: 11906, height: 16838 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({
              text: 'HELIOS v2.4 · Защитная записка · UTM FCIM',
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

const outPath = 'C:\\Users\\olegt\\OneDrive\\Desktop\\project annual university\\Raport_HELIOS_v2.4_Defence.docx';
const buf = await Packer.toBuffer(doc);
await writeFile(outPath, buf);
console.log(`Generated: ${outPath} (${buf.length} bytes)`);
