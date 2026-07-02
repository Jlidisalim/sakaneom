// Bilingual (FR/AR) legal pages. The copy below is a reasonable DRAFT — it must
// be reviewed by counsel before launch. Data specifics reflect the actual app:
// the only personal data collected is the "Request Info" lead form (name, email,
// phone, optional message) plus a first-party, no-PII analytics cookie (sk_vid).
import { Link } from "@tanstack/react-router";

import { useSite } from "./shell";

type Section = { h: string; p: string[] };
type Doc = { title: string; updated: string; intro: string; sections: Section[] };

function privacyDoc(lang: "fr" | "ar", email: string): Doc {
  if (lang === "ar") {
    return {
      title: "سياسة الخصوصية",
      updated: "آخر تحديث: 2026",
      intro:
        "تحترم SAKANEOM خصوصيتك. توضّح هذه السياسة البيانات التي نجمعها عبر هذا الموقع وكيفية استخدامها وحقوقك. (مسودة — تُراجَع قانونياً قبل النشر.)",
      sections: [
        {
          h: "البيانات التي نجمعها",
          p: [
            "نموذج «طلب معلومات»: الاسم، البريد الإلكتروني، الهاتف، ورسالتك الاختيارية.",
            "ملف تعريف ارتباط للتحليلات (sk_vid) لعدّ الزوّار دون أي بيانات شخصية.",
          ],
        },
        {
          h: "الغرض والأساس القانوني",
          p: [
            "نستخدم بياناتك للرد على استفسارك ومتابعة طلبك فقط، استناداً إلى موافقتك.",
            "لا نبيع بياناتك ولا نشاركها مع أطراف ثالثة لأغراض تسويقية.",
          ],
        },
        {
          h: "مدة الحفظ",
          p: [
            "نحتفظ ببيانات الطلبات لمدة تصل إلى 24 شهراً ثم تُحذف، ما لم يقتضِ القانون خلاف ذلك.",
          ],
        },
        {
          h: "حقوقك",
          p: [`يمكنك طلب الوصول إلى بياناتك أو تصحيحها أو حذفها بمراسلتنا على ${email}.`],
        },
        { h: "الاتصال", p: [`لأي سؤال حول الخصوصية: ${email}.`] },
      ],
    };
  }
  return {
    title: "Politique de confidentialité",
    updated: "Dernière mise à jour : 2026",
    intro:
      "SAKANEOM respecte votre vie privée. Cette politique décrit les données collectées via ce site, leur utilisation et vos droits. (Brouillon — à faire valider par un conseil juridique avant publication.)",
    sections: [
      {
        h: "Données collectées",
        p: [
          "Formulaire « Demande d'information » : nom, e-mail, téléphone et message facultatif.",
          "Un cookie d'analyse (sk_vid) qui compte les visiteurs sans aucune donnée personnelle.",
        ],
      },
      {
        h: "Finalité et base légale",
        p: [
          "Vos données servent uniquement à répondre à votre demande et à en assurer le suivi, sur la base de votre consentement.",
          "Nous ne vendons pas vos données et ne les partageons pas à des fins marketing.",
        ],
      },
      {
        h: "Durée de conservation",
        p: [
          "Les demandes sont conservées jusqu'à 24 mois, puis supprimées, sauf obligation légale contraire.",
        ],
      },
      {
        h: "Vos droits",
        p: [
          `Vous pouvez demander l'accès, la rectification ou la suppression de vos données en nous écrivant à ${email}.`,
        ],
      },
      { h: "Contact", p: [`Pour toute question relative à la confidentialité : ${email}.`] },
    ],
  };
}

function termsDoc(lang: "fr" | "ar", brand: string): Doc {
  if (lang === "ar") {
    return {
      title: "شروط الاستخدام",
      updated: "آخر تحديث: 2026",
      intro: `باستخدامك هذا الموقع فإنك توافق على هذه الشروط. (مسودة — تُراجَع قانونياً قبل النشر.)`,
      sections: [
        {
          h: "المحتوى",
          p: [
            "تُقدَّم المعلومات والصور والأسعار لأغراض العرض فقط وقد تتغيّر دون إشعار، ولا تُعدّ عرضاً تعاقدياً.",
          ],
        },
        { h: "الملكية الفكرية", p: [`جميع عناصر هذا الموقع مملوكة لـ ${brand}.`] },
        { h: "المسؤولية", p: ["لا نتحمّل مسؤولية أي ضرر ناتج عن استخدام الموقع."] },
      ],
    };
  }
  return {
    title: "Conditions d'utilisation",
    updated: "Dernière mise à jour : 2026",
    intro: `En utilisant ce site, vous acceptez les présentes conditions. (Brouillon — à faire valider par un conseil juridique avant publication.)`,
    sections: [
      {
        h: "Contenu",
        p: [
          "Les informations, visuels et prix sont fournis à titre indicatif, peuvent évoluer sans préavis et ne constituent pas une offre contractuelle.",
        ],
      },
      {
        h: "Propriété intellectuelle",
        p: [`Tous les éléments de ce site sont la propriété de ${brand}.`],
      },
      {
        h: "Responsabilité",
        p: ["Nous déclinons toute responsabilité en cas de dommage lié à l'utilisation du site."],
      },
    ],
  };
}

export function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const { lang, content, contact } = useSite();
  const doc =
    kind === "privacy" ? privacyDoc(lang, contact.email) : termsDoc(lang, content.header.brand);

  return (
    <section className="bg-paper py-24 sm:py-32">
      <div className="mx-auto max-w-2xl px-5 sm:px-8">
        <h1 className="font-display text-[clamp(2.25rem,5vw,3.5rem)] leading-tight">{doc.title}</h1>
        <p className="mono mt-3 text-[10px] uppercase tracking-[0.22em] text-stone">
          {doc.updated}
        </p>
        <div className="hairline mt-6 w-16" />
        <p className="mt-8 text-ink/80">{doc.intro}</p>
        <div className="mt-10 space-y-8">
          {doc.sections.map((s, i) => (
            <div key={i}>
              <h2 className="font-display text-xl text-ink">{s.h}</h2>
              <div className="mt-3 space-y-2 text-ink/75">
                {s.p.map((para, j) => (
                  <p key={j}>{para}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Link
          to="/"
          className="gold-fill mono mt-12 inline-flex rounded-full px-6 py-3 text-xs uppercase tracking-[0.22em]"
        >
          {lang === "ar" ? "العودة إلى الرئيسية →" : "Retour à l'accueil →"}
        </Link>
      </div>
    </section>
  );
}
