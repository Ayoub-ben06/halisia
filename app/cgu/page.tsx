import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, ToComplete } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Conditions générales d’utilisation — Halisia" };

export default function TermsPage() {
  return (
    <LegalPage title="Conditions générales d’utilisation" updatedAt="24 septembre 2026">
      <LegalSection title="1. Objet">
        <p>Les présentes conditions régissent l’utilisation de Halisia, service en ligne de suivi de patrimoine, d’analyse de conformité Shariah des actions, de calcul de la Zakat et de la purification, édité par <ToComplete>raison sociale</ToComplete>.</p>
      </LegalSection>
      <LegalSection title="2. Compte">
        <p>L’accès aux fonctionnalités personnelles nécessite un compte. Vous êtes responsable de la confidentialité de vos identifiants et de l’exactitude des données saisies. Vous pouvez supprimer votre compte à tout moment depuis les paramètres.</p>
      </LegalSection>
      <LegalSection title="3. Nature des analyses">
        <p>Les verdicts de conformité, ratios, montants de Zakat et de purification sont calculés automatiquement à partir de données publiques selon la <Link href="/methodologie" className="text-[#f2ca6e] hover:underline">méthodologie publiée</Link>. Ils sont fournis à titre informatif, peuvent contenir des erreurs ou être affectés par des données incomplètes, et <strong>ne constituent ni un conseil en investissement, ni une recommandation, ni une fatwa</strong>. Les décisions d’investissement et les obligations religieuses relèvent de votre seule responsabilité.</p>
      </LegalSection>
      <LegalSection title="4. Prix">
        <p>Pendant la phase de lancement, le service est gratuit. L’ouverture d’une offre payante sera annoncée à l’avance ; aucune somme ne sera prélevée sans votre accord explicite.</p>
      </LegalSection>
      <LegalSection title="5. Utilisation acceptable">
        <p>Il est interdit d’extraire massivement les données du service, de contourner les limitations techniques, ou d’utiliser le service à des fins illicites. Halisia peut suspendre un compte en cas d’abus.</p>
      </LegalSection>
      <LegalSection title="6. Responsabilité">
        <p>Halisia met en œuvre les moyens raisonnables pour assurer l’exactitude des analyses et la disponibilité du service, sans garantie de résultat. Halisia ne saurait être tenu responsable des pertes financières résultant de décisions prises sur la base des informations fournies.</p>
      </LegalSection>
      <LegalSection title="7. Données personnelles">
        <p>Le traitement de vos données est décrit dans la <Link href="/confidentialite" className="text-[#f2ca6e] hover:underline">politique de confidentialité</Link>.</p>
      </LegalSection>
      <LegalSection title="8. Droit applicable">
        <p>Les présentes conditions sont soumises au droit français. <ToComplete>tribunal compétent et modalités de médiation de la consommation, le cas échéant</ToComplete></p>
      </LegalSection>
    </LegalPage>
  );
}
