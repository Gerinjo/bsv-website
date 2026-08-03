export type DocumentTable = {
  title: string;
  columns: string[];
  rows: Array<{ cells: string[]; emphasis?: boolean }>;
  note?: string;
};

export type DocumentSection = {
  id: string;
  number: string;
  kicker: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  table?: DocumentTable;
  accent?: boolean;
};

export type DocumentProfile = {
  type: 'Satzung' | 'Beitragsordnung';
  edition: string;
  readingTime: string;
  intro: string;
  highlights: Array<{ value: string; label: string; detail: string }>;
  sections: DocumentSection[];
  pdf: { href: string; label: string; meta: string };
};

export const documentPages: Record<string, DocumentProfile> = {
  'verein/satzung': {
    type: 'Satzung',
    edition: 'Stand 31.01.2023',
    readingTime: '7 Themenbereiche',
    intro: 'Die Satzung ist die Verfassung unseres Vereins. Sie beschreibt, wofür der BSV Nordstern steht, wie Entscheidungen getroffen werden und welche Rechte und Pflichten unsere Mitglieder haben.',
    highlights: [
      { value: '01', label: 'Gemeinnützigkeit', detail: 'Sport fördern und Jugend unterstützen' },
      { value: '02', label: 'Mitbestimmung', detail: 'Entscheidungen in der Mitgliederversammlung' },
      { value: '03', label: 'Verantwortung', detail: 'Klare Aufgaben für Vorstand und Organe' },
    ],
    sections: [
      {
        id: 'grundsaetze', number: '01', kicker: 'Zweck & Haltung', title: 'Grundsätze und Zwecke',
        paragraphs: ['Die Satzung des BSV Nordstern Radolfzell verfolgt das Ziel, den Fußballsport zu fördern und die Jugend zu unterstützen. Sie legt die Grundlagen für eine gemeinnützige Vereinsarbeit und definiert die Aufgaben und Verantwortlichkeiten der verschiedenen Organe und Funktionsträger.'],
      },
      {
        id: 'mitgliedschaft', number: '02', kicker: 'Teil der Gemeinschaft', title: 'Mitgliedschaft und Rechte',
        paragraphs: ['Die Satzung regelt die Bedingungen und Voraussetzungen für die Mitgliedschaft im BSV Nordstern Radolfzell und definiert die Rechte und Pflichten der Mitglieder. Sie legt fest, wie der Verein organisiert ist und wie Entscheidungen getroffen werden.'],
      },
      {
        id: 'organe', number: '03', kicker: 'Struktur & Aufgaben', title: 'Organe und Funktionen',
        paragraphs: ['Die Satzung beschreibt die Struktur und Zusammensetzung der Organe des BSV Nordstern Radolfzell, darunter die Vorstandschaft, die Jugendvorstandschaft und den Förderverein. Sie definiert die Aufgaben und Kompetenzen dieser Organe sowie die Wahl- und Amtszeiten ihrer Mitglieder.'],
      },
      {
        id: 'finanzierung', number: '04', kicker: 'Sorgfalt & Sicherheit', title: 'Finanzierung und Haftung',
        paragraphs: ['Die Satzung regelt die Finanzierung des Vereins und legt fest, wie die finanziellen Mittel verwaltet und verwendet werden. Sie enthält Bestimmungen zur Haftung der Vereinsmitglieder und zur Verwendung von Vereinsvermögen.'],
      },
      {
        id: 'aenderungen', number: '05', kicker: 'Gemeinsam entscheiden', title: 'Satzungsänderungen', accent: true,
        paragraphs: ['Die Satzung des BSV Nordstern Radolfzell kann nur durch Beschluss der Mitgliederversammlung geändert werden. Sie legt das Verfahren für Satzungsänderungen fest und stellt sicher, dass diese im Einklang mit den gesetzlichen Bestimmungen erfolgen.'],
      },
      {
        id: 'rechtsgrundlage', number: '06', kicker: 'Verbindlicher Rahmen', title: 'Rechtliche Grundlage',
        paragraphs: ['Die Satzung des BSV Nordstern Radolfzell basiert auf den geltenden gesetzlichen Vorschriften und Bestimmungen des Vereinsrechts. Sie dient als verbindliche Grundlage für die Vereinsarbeit und gibt Orientierung für die Zusammenarbeit und Organisation im Verein.'],
      },
    ],
    pdf: {
      href: '/dokumente/bsv-nordstern-satzung-2023.pdf',
      label: 'Vereinssatzung öffnen',
      meta: 'Rechtsverbindliche Fassung · PDF',
    },
  },
  'verein/beitragsordnung': {
    type: 'Beitragsordnung',
    edition: 'Gültig ab 01.01.2026',
    readingTime: 'Beiträge & Regelungen',
    intro: 'Die Beitragsordnung schafft Transparenz über Mitgliedsbeiträge, Zahlungswege und Ermäßigungen. Die zum 1. Januar 2026 beschlossenen Anpassungen sind hier übersichtlich zusammengefasst.',
    highlights: [
      { value: '125 €', label: 'Fußball aktiv', detail: 'Jahresbeitrag ab 2026' },
      { value: '100 €', label: 'Junge Sterne', detail: 'Jahresbeitrag ab 2026' },
      { value: '200 €', label: 'Familien', detail: 'Maximalbeitrag pro Jahr' },
    ],
    sections: [
      {
        id: 'grundlage', number: '01', kicker: 'Verlässlicher Rahmen', title: 'Grundlage der Beiträge',
        paragraphs: [
          'Die Beitragsordnung des BSV Nordstern Radolfzell bildet die Grundlage für die Festlegung der Mitgliedsbeiträge und regelt die finanziellen Verpflichtungen der Vereinsmitglieder.',
          'Sie legt die Höhe der Beiträge für unterschiedliche Mitgliedschaftskategorien fest – darunter aktive und passive Mitglieder, Jugendliche und Familien. Außerdem regelt sie Fälligkeit und Zahlungsmodalitäten.',
          'Regelungen zur Kündigung und zu einer möglichen Erstattung bereits geleisteter Beiträge sowie das Verfahren für Änderungen richten sich nach der Beitragsordnung und der Vereinssatzung.',
        ],
      },
      {
        id: 'anpassung-2026', number: '02', kicker: 'Beschluss der Mitgliederversammlung', title: 'Beitragsanpassungen ab 2026', accent: true,
        paragraphs: ['Mit Wirkung zum 01.01.2026 wurde eine Anpassung der Beitragsordnung beschlossen. Die Erhöhungen ergeben sich aus den jeweiligen Abteilungsbeiträgen; die Grundbeiträge bleiben unverändert.'],
        table: {
          title: 'Grund- und Abteilungsbeiträge',
          columns: ['Abteilung / Mitgliedsart', 'Bis 31.12.2025', 'Ab 01.01.2026', 'Veränderung'],
          rows: [
            { cells: ['Passiv', '45 €', '45 €', '± 0 €'] },
            { cells: ['Ehrenmitglied', '0 €', '0 €', '± 0 €'] },
            { cells: ['Übungsleiter', '0 €', '0 €', '± 0 €'] },
            { cells: ['Fußball (aktiv)', '115 €', '125 €', '+10 €'], emphasis: true },
            { cells: ['Bogensport (aktiv)', '105 €', '115 €', '+10 €'], emphasis: true },
            { cells: ['Gymnastik (aktiv)', '105 €', '115 €', '+10 €'], emphasis: true },
            { cells: ['Wandern', '45 €', '45 €', '± 0 €'] },
            { cells: ['Jugend', '90 €', '100 €', '+10 €'], emphasis: true },
          ],
          note: 'Die Beitragserhöhungen entstehen ausschließlich durch angepasste Abteilungsbeiträge. Die Grundbeiträge bleiben unverändert.',
        },
      },
      {
        id: 'familien', number: '03', kicker: 'Gemeinsam gedeckelt', title: 'Familienbeiträge',
        paragraphs: ['Auch bei den Familienbeiträgen ergeben sich Anpassungen, die sich aus den erhöhten Einzelbeiträgen ableiten. Unverändert bleibt der maximale Jahresbeitrag pro Familie von 200 Euro.'],
        table: {
          title: 'Beispielhafte Gegenüberstellung',
          columns: ['Familienkonstellation', 'Bis 31.12.2025', 'Ab 01.01.2026', 'Veränderung'],
          rows: [
            { cells: ['Aktiv: 1 Erwachsener + 1 Kind', '140 €', '150 €', '+10 €'] },
            { cells: ['Jugend: 2 Kinder', '140 €', '150 €', '+10 €'] },
            { cells: ['Aktiv: 1 Erwachsener + 3 Kinder*', '240 €*', '250 €*', '+10 €'] },
            { cells: ['Aktiv: 2 Erwachsene + 3 Kinder*', '290 €*', '300 €*', '+10 €'] },
          ],
          note: '* Die genannten Beträge unterliegen der Deckelung auf maximal 200 Euro pro Familie und Jahr.',
        },
      },
      {
        id: 'gruende', number: '04', kicker: 'Stabil in die Zukunft', title: 'Gründe für die Anpassung',
        paragraphs: ['Die Beitragsanpassung ist notwendig, um einen stabilen und nachhaltigen Vereinsbetrieb sicherzustellen. Mit den Mehreinnahmen werden insbesondere folgende Bereiche dauerhaft abgesichert:'],
        bullets: [
          'gestiegene Verbands- und Versicherungsabgaben',
          'höhere Kosten für Sportbetrieb, Material und Infrastruktur',
          'die Qualität der Trainings- und Vereinsangebote',
        ],
      },
      {
        id: 'unveraendert', number: '05', kicker: 'Was bestehen bleibt', title: 'Keine Änderungen',
        paragraphs: ['Die Anpassung betrifft nicht alle Bestandteile der Beitragsordnung. Folgende Regelungen bleiben unverändert:'],
        bullets: [
          'Beitragsbefreiung für Ehrenmitglieder, Übungsleiter und ehrenamtliche Funktionsträger',
          'Zahlungsmodalitäten, Lastschriftverfahren und Fälligkeitstermine',
          'Kündigungsfristen und Kündigungsverfahren',
          'Deckelung der Familienbeiträge',
        ],
      },
      {
        id: 'rechtsgrundlage', number: '06', kicker: 'Verbindliche Fassung', title: 'Rechtliche Grundlage',
        paragraphs: ['Die Beitragsordnung basiert auf den geltenden gesetzlichen Vorschriften und den Bestimmungen der Vereinssatzung. Sie dient als verbindliche Grundlage für die Festlegung der Mitgliedsbeiträge und gibt Orientierung für die finanzielle Organisation des Vereins.'],
      },
    ],
    pdf: {
      href: '/images/migration/7bdd8e83ca-BSV_Beitragsordnung_260101.pdf',
      label: 'Beitragsordnung öffnen',
      meta: 'Vollständige Fassung · PDF',
    },
  },
};
