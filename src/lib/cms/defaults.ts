// ────────────────────────────────────────────────────────────────────────────
// DEFAULT_CONTENT — the site's content as originally shipped, expressed in the
// residence-centric model. Seeds the store on first run and acts as fallback.
// ────────────────────────────────────────────────────────────────────────────
import type { Content, L, Residence, ResidenceStatus, Unit, UnitType } from "./types";

import heroDesktop from "@/assets/hero-desktop.webp";
import heroMobile from "@/assets/hero-mobile.webp";
import logoImg from "@/assets/logo-sakaneom.webp";
import interiorImg from "@/assets/interior.jpg";
import aerialImg from "@/assets/aerial.jpg";
import exteriorImg from "@/assets/exterior.jpg";
import g1 from "@/assets/gallery-1.jpg";
import g2 from "@/assets/gallery-2.jpg";
import g3 from "@/assets/gallery-3.jpg";
import g4 from "@/assets/gallery-4.jpg";
import g5 from "@/assets/gallery-5.jpg";
import g6 from "@/assets/gallery-6.jpg";
import p1 from "@/assets/project-1.jpg";
import p2 from "@/assets/project-2.jpg";
import p3 from "@/assets/project-3.jpg";

export const ASSET_DEFAULTS = {
  heroDesktop,
  heroMobile,
  logo: logoImg,
  interior: interiorImg,
  aerial: aerialImg,
  exterior: exteriorImg,
  gallery: [g1, g2, g3, g4, g5, g6],
  projects: [p1, p2, p3],
};

const GALLERY_SPANS = ["sm:col-span-2 sm:row-span-2", "", "", "sm:col-span-2", "sm:row-span-2", ""];

const EMPTY_PLANS: Record<UnitType, string> = { "S+1": "", "S+2": "", "S+3": "", "S+4": "" };

// ── Flagship residence: Al Bahia ──────────────────────────────────────────────

const AL_BAHIA: Residence = {
  id: "al-bahia",
  slug: "al-bahia",
  name: { fr: "Résidence Al Bahia", ar: "إقامة الباهية" },
  status: "on-sale",
  locationLabel: { fr: "La Marsa", ar: "المرسى" },
  deliveryYear: "2026",
  unitType: { fr: "R+2", ar: "أرضي + ٢" },
  cardImage: exteriorImg,
  hero: {
    eyebrow: { fr: "SAKANEOM · LA MARSA", ar: "سكنيوم · المرسى" },
    title1: { fr: "Vivre", ar: "عش" },
    title2: { fr: "l'exception.", ar: "الاستثناء." },
    sub: {
      fr: "Une résidence de haut standing à quelques pas de la mer.",
      ar: "إقامة راقية على بعد خطوات من البحر.",
    },
    cta: { fr: "Voir le projet", ar: "اكتشف المشروع" },
    imageDesktop: heroDesktop,
    imageMobile: heroMobile,
  },
  intro: {
    title: { fr: "Résidence Al Bahia", ar: "إقامة الباهية" },
    p1: {
      fr: "Quarante-deux appartements pensés comme des maisons. Pierre claire, bois massif et larges baies vitrées composent une architecture sobre et lumineuse, ancrée dans la tradition méditerranéenne.",
      ar: "اثنان وأربعون شقة صُمّمت كمنازل. حجر فاتح وخشب طبيعي ونوافذ واسعة في تناغم معماري هادئ يستلهم تقاليد المتوسط.",
    },
    p2: {
      fr: "Au cœur de La Marsa, entre les jardins du Belvédère et la plage, Al Bahia offre l'intimité d'une adresse confidentielle avec les services d'une résidence de prestige.",
      ar: "في قلب المرسى، بين حدائق البلفيدير والشاطئ، تجمع الباهية بين الخصوصية وخدمات الإقامات الفاخرة.",
    },
    image: exteriorImg,
  },
  banner: {
    line: { fr: "Résidence Al Bahia — au cœur de La Marsa", ar: "إقامة الباهية — في قلب المرسى" },
    meta: [
      { k: { fr: "EMPLACEMENT", ar: "الموقع" }, v: { fr: "LA MARSA", ar: "المرسى" } },
      { k: { fr: "TYPE", ar: "النوع" }, v: { fr: "R+2", ar: "أرضي + ٢" } },
      { k: { fr: "LIVRAISON", ar: "التسليم" }, v: { fr: "2026", ar: "٢٠٢٦" } },
    ],
    image: aerialImg,
  },
  highlight: {
    title: { fr: "Une résidence d'exception", ar: "إقامة استثنائية" },
    p: {
      fr: "Pensée par des architectes tunisiens, façonnée par des artisans locaux. Chaque détail — du marbre des sols à la poignée de laiton — répond à une exigence unique : durer.",
      ar: "صمّمها مهندسون تونسيون، نفّذها حرفيون محليون. كل تفصيل — من رخام الأرضيات إلى مقابض النحاس — يستجيب لمعيار واحد: الديمومة.",
    },
    feat: { fr: "Le prestige de l'emplacement.", ar: "هيبة الموقع." },
    featP: {
      fr: "Sur l'une des dernières parcelles privées de La Marsa, face à la mer, à deux pas du Café Saf-Saf et des plages.",
      ar: "على إحدى آخر القطع الخاصة في المرسى، تطل على البحر، على بُعد خطوات من مقهى الصفصاف.",
    },
    pills: [
      { a: { fr: "7 min", ar: "٧ د" }, b: { fr: "Plage de Marsa", ar: "شاطئ المرسى" } },
      { a: { fr: "12 min", ar: "١٢ د" }, b: { fr: "Centre Ville", ar: "وسط المدينة" } },
      { a: { fr: "20 min", ar: "٢٠ د" }, b: { fr: "Aéroport", ar: "المطار" } },
    ],
    image: interiorImg,
  },
  gallery: {
    images: [g1, g2, g3, g4, g5, g6].map((url, i) => ({
      id: `g${i + 1}`,
      url,
      span: GALLERY_SPANS[i],
      alt: "",
    })),
    video: {
      label: { fr: "Visite guidée en vidéo", ar: "جولة بالفيديو" },
      sub: {
        fr: "Découvrez la résidence Al Bahia en mouvement.",
        ar: "اكتشف إقامة الباهية في فيديو.",
      },
      src: "/al-bahia-tour.mp4",
      poster: exteriorImg,
    },
  },
  pricing: {
    plans: { "S+1": g1, "S+2": g3, "S+3": g6, "S+4": g6 },
    units: [
      {
        id: "u1",
        no: "A-101",
        etage: "RDC",
        type: "S+1",
        pieces: 2,
        surface: 54,
        terrasse: 12,
        prix: 470000,
        status: "available",
      },
      {
        id: "u2",
        no: "A-102",
        etage: "RDC",
        type: "S+1",
        pieces: 2,
        surface: 58,
        terrasse: 14,
        prix: 495000,
        status: "available",
      },
      {
        id: "u3",
        no: "B-201",
        etage: "1er",
        type: "S+1",
        pieces: 2,
        surface: 62,
        terrasse: 10,
        prix: 525000,
        status: "available",
      },
      {
        id: "u4",
        no: "A-201",
        etage: "1er",
        type: "S+2",
        pieces: 3,
        surface: 82,
        terrasse: 16,
        prix: 690000,
        status: "available",
      },
      {
        id: "u5",
        no: "B-202",
        etage: "1er",
        type: "S+2",
        pieces: 3,
        surface: 88,
        terrasse: 18,
        prix: 735000,
        status: "available",
      },
      {
        id: "u6",
        no: "A-301",
        etage: "2e",
        type: "S+2",
        pieces: 3,
        surface: 92,
        terrasse: 22,
        prix: 780000,
        status: "reserved",
      },
      {
        id: "u7",
        no: "P-301",
        etage: "2e",
        type: "S+3",
        pieces: 4,
        surface: 124,
        terrasse: 38,
        prix: 1140000,
        status: "available",
      },
      {
        id: "u8",
        no: "P-302",
        etage: "2e",
        type: "S+3",
        pieces: 4,
        surface: 138,
        terrasse: 46,
        prix: 1290000,
        status: "sold",
      },
    ],
  },
  location: {
    p: {
      fr: "Une adresse rare, entre mer et collines, au cœur d'un quartier résidentiel paisible de La Marsa.",
      ar: "عنوان نادر بين البحر والتلال، في حي سكني هادئ بالمرسى.",
    },
    near: [
      { fr: "Plage de La Marsa — 600 m", ar: "شاطئ المرسى — ٦٠٠ م" },
      { fr: "Marché central — 800 m", ar: "السوق المركزي — ٨٠٠ م" },
      { fr: "École internationale — 1.2 km", ar: "المدرسة الدولية — ١٫٢ كم" },
      { fr: "Marina Gammarth — 5 km", ar: "مرسى قمرت — ٥ كم" },
    ],
    center: { lat: 36.878, lng: 10.323 },
    zoom: 15,
    markers: [
      { id: "m1", name: "Résidence Al Bahia", lat: 36.878, lng: 10.323, kind: "residence" },
      { id: "m2", name: "Plage de La Marsa", lat: 36.8825, lng: 10.3245, kind: "beach" },
    ],
  },
};

// ── Other residences (standardized from the former portfolio) ─────────────────

function makeResidence(args: {
  id: string;
  name: L;
  location: L;
  year: string;
  type: L;
  image: string;
  status: ResidenceStatus;
  lat: number;
  lng: number;
  desc: L;
}): Residence {
  const { id, name, location, year, type, image, status, lat, lng, desc } = args;
  return {
    id,
    slug: id,
    name,
    status,
    locationLabel: location,
    deliveryYear: year,
    unitType: type,
    cardImage: image,
    hero: {
      eyebrow: { fr: `SAKANEOM · ${location.fr.toUpperCase()}`, ar: `سكنيوم · ${location.ar}` },
      title1: name,
      title2: { fr: "", ar: "" },
      sub: desc,
      cta: { fr: "Voir la résidence", ar: "اكتشف الإقامة" },
      imageDesktop: image,
      imageMobile: image,
    },
    intro: {
      title: name,
      p1: desc,
      p2: { fr: "", ar: "" },
      image,
    },
    banner: {
      line: { fr: `${name.fr} — ${location.fr}`, ar: `${name.ar} — ${location.ar}` },
      meta: [
        {
          k: { fr: "EMPLACEMENT", ar: "الموقع" },
          v: { fr: location.fr.toUpperCase(), ar: location.ar },
        },
        { k: { fr: "TYPE", ar: "النوع" }, v: type },
        { k: { fr: "LIVRAISON", ar: "التسليم" }, v: { fr: year, ar: year } },
      ],
      image,
    },
    highlight: {
      title: { fr: "Un projet signé SAKANEOM", ar: "مشروع بتوقيع سكنيوم" },
      p: desc,
      feat: { fr: "Qualité et finitions.", ar: "الجودة والتشطيبات." },
      featP: desc,
      pills: [],
      image,
    },
    gallery: {
      images: [{ id: `${id}-g1`, url: image, span: "sm:col-span-2 sm:row-span-2", alt: "" }],
      video: {
        label: { fr: "Visite guidée en vidéo", ar: "جولة بالفيديو" },
        sub: { fr: "", ar: "" },
        src: "",
        poster: image,
      },
    },
    pricing: { plans: { ...EMPTY_PLANS }, units: [] as Unit[] },
    location: {
      p: desc,
      near: [],
      center: { lat, lng },
      zoom: 14,
      markers: [{ id: `${id}-m1`, name: name.fr, lat, lng, kind: "residence" }],
    },
  };
}

const VILLA_CARTHAGE = makeResidence({
  id: "villa-carthage",
  name: { fr: "Villa Carthage", ar: "فيلا قرطاج" },
  location: { fr: "Carthage", ar: "قرطاج" },
  year: "2024",
  type: { fr: "Villa", ar: "فيلا" },
  image: p1,
  status: "delivered",
  lat: 36.858,
  lng: 10.323,
  desc: {
    fr: "Une villa d'exception livrée en 2024, alliant volumes généreux et matériaux nobles dans l'écrin historique de Carthage.",
    ar: "فيلا استثنائية سُلّمت في ٢٠٢٤، تجمع بين الفضاءات الرحبة والمواد النبيلة في إطار قرطاج التاريخي.",
  },
});

const RESIDENCE_YASMINE = makeResidence({
  id: "residence-yasmine",
  name: { fr: "Résidence Yasmine", ar: "إقامة الياسمين" },
  location: { fr: "Gammarth", ar: "قمرت" },
  year: "2023",
  type: { fr: "R+3", ar: "أرضي + ٣" },
  image: p2,
  status: "delivered",
  lat: 36.92,
  lng: 10.29,
  desc: {
    fr: "Une résidence contemporaine à Gammarth, pensée pour la lumière et les vues sur mer, livrée en 2023.",
    ar: "إقامة عصرية في قمرت، صُمّمت للضوء وإطلالات البحر، سُلّمت في ٢٠٢٣.",
  },
});

const DOMAINE_EL_MANAR = makeResidence({
  id: "domaine-el-manar",
  name: { fr: "Domaine El Manar", ar: "ضيعة المنار" },
  location: { fr: "El Manar", ar: "المنار" },
  year: "2022",
  type: { fr: "R+2", ar: "أرضي + ٢" },
  image: p3,
  status: "delivered",
  lat: 36.84,
  lng: 10.16,
  desc: {
    fr: "Un domaine résidentiel paisible à El Manar, mêlant espaces verts et architecture sobre, livré en 2022.",
    ar: "ضيعة سكنية هادئة في المنار، تمزج المساحات الخضراء والعمارة الأنيقة، سُلّمت في ٢٠٢٢.",
  },
});

// ── Whole site ──────────────────────────────────────────────────────────────

export const DEFAULT_CONTENT: Content = {
  version: 2,
  updatedAt: "1970-01-01T00:00:00.000Z",

  header: {
    brand: "SAKANEOM",
    brandAr: "سكنيوم",
    logo: logoImg,
    email: "contact@sakaneom.com",
    phone: "+216 55 555 555",
    whatsapp: "https://wa.me/21655555555",
    instagram: "https://instagram.com/sakaneom",
    facebook: "https://facebook.com/sakaneom",
    addressLine1: "12, Avenue Habib Bourguiba",
    addressLine2: "2070 La Marsa, Tunisie",
    nav: [
      { fr: "Le projet", ar: "المشروع" },
      { fr: "Galerie", ar: "المعرض" },
      { fr: "Prix & Plans", ar: "الأسعار والمخططات" },
      { fr: "Emplacement", ar: "الموقع" },
      { fr: "Contact", ar: "تواصل" },
    ],
    // Empty = use the built-in default target for each slot. Editors can override
    // any slot with an explicit anchor, path, or external URL in the admin.
    navLinks: ["", "", "", "", ""],
  },

  primaryResidenceId: "al-bahia",
  residences: [AL_BAHIA, VILLA_CARTHAGE, RESIDENCE_YASMINE, DOMAINE_EL_MANAR],

  labels: {
    introEye: { fr: "01 — LE PROJET", ar: "٠١ — المشروع" },
    galleryEye: { fr: "02 — GALERIE", ar: "٠٢ — المعرض" },
    galleryTitle: { fr: "En images", ar: "بالصور" },
    pricingEye: { fr: "03 — PRIX & PLANS", ar: "٠٣ — الأسعار والمخططات" },
    pricingTitle: { fr: "Les prix, les plans", ar: "الأسعار والمخططات" },
    cols: [
      { fr: "N°", ar: "رقم" },
      { fr: "Étage", ar: "طابق" },
      { fr: "Type", ar: "نوع" },
      { fr: "Pièces", ar: "غرف" },
      { fr: "Surface", ar: "مساحة" },
      { fr: "Terrasse", ar: "تراس" },
      { fr: "Plan", ar: "مخطط" },
      { fr: "Demande", ar: "طلب" },
      { fr: "Prix total TTC", ar: "السعر الإجمالي" },
    ],
    viewPlan: { fr: "Voir plan", ar: "عرض المخطط" },
    askInfo: { fr: "Demande d'info", ar: "طلب معلومات" },
    locationEye: { fr: "04 — EMPLACEMENT", ar: "٠٤ — الموقع" },
    locationTitle: { fr: "L'emplacement", ar: "الموقع" },
    scroll: { fr: "Découvrir", ar: "اكتشف" },
    residencesTitle: { fr: "Découvrez nos résidences", ar: "اكتشف إقاماتنا" },
    viewResidence: { fr: "Voir la résidence", ar: "اكتشف الإقامة" },
    status: {
      "on-sale": { fr: "En vente", ar: "للبيع" },
      "coming-soon": { fr: "Bientôt", ar: "قريباً" },
      delivered: { fr: "Livré", ar: "تم التسليم" },
      "sold-out": { fr: "Complet", ar: "مكتمل" },
    },
  },

  about: {
    title: { fr: "SAKANEOM", ar: "سكنيوم" },
    p: {
      fr: "Promoteur immobilier spécialisé dans le haut standing. Depuis 2008, nous concevons des résidences à taille humaine, où l'architecture, les matériaux et le service se rejoignent.",
      ar: "مطوّر عقاري متخصّص في الفخامة. منذ ٢٠٠٨، نصمّم إقامات بمقاس إنساني تجتمع فيها العمارة والمواد والخدمة.",
    },
    stats: [
      { n: { fr: "18", ar: "١٨" }, l: { fr: "années", ar: "سنة" } },
      { n: { fr: "12", ar: "١٢" }, l: { fr: "projets livrés", ar: "مشروع" } },
      { n: { fr: "340", ar: "٣٤٠" }, l: { fr: "clients", ar: "عميل" } },
    ],
    image: aerialImg,
  },

  contact: {
    title: { fr: "Parlons de votre projet.", ar: "لنتحدّث عن مشروعك." },
    hoursLabel: { fr: "Horaire de visite", ar: "أوقات الزيارة" },
    hours: [
      { fr: "Lun – Ven · 8h – 17h", ar: "الإثنين – الجمعة · ٨ص – ٥م" },
      { fr: "Sam · 8h – 13h", ar: "السبت · ٨ص – ١م" },
      { fr: "Dim · fermé", ar: "الأحد · مغلق" },
    ],
    quick: { fr: "Liens rapides", ar: "روابط سريعة" },
    follow: { fr: "Suivez-nous", ar: "تابعنا" },
    contactLabel: { fr: "Contact", ar: "تواصل" },
    designed: { fr: "Conçu par SAKANEOM Studio", ar: "تصميم سكنيوم ستوديو" },
    footerProjects: { fr: "À propos · Résidences · Contact", ar: "من نحن · الإقامات · تواصل" },
  },

  forms: {
    name: { fr: "Nom et prénom", ar: "الاسم واللقب" },
    email: { fr: "Email", ar: "البريد" },
    phone: { fr: "Téléphone", ar: "الهاتف" },
    msg: { fr: "Message", ar: "الرسالة" },
    consent: {
      fr: "J'accepte d'être contacté à propos de ma demande.",
      ar: "أوافق على الاتصال بي بخصوص طلبي.",
    },
    send: { fr: "Envoyer", ar: "إرسال" },
    sent: {
      fr: "Demande envoyée — nous vous recontactons sous 24 h.",
      ar: "تم إرسال الطلب — سنعاود الاتصال خلال ٢٤ ساعة.",
    },
    panelTitle: { fr: "Demande d'informations", ar: "طلب معلومات" },
    panelApt: { fr: "Appartement", ar: "الشقة" },
    panelSend: { fr: "Envoyer la demande", ar: "إرسال الطلب" },
  },
};
