import type { Metadata } from "next";
import { LegalPage, LegalSection, ToComplete } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Mentions légales — Halisia" };

export default function LegalNoticePage() {
  return (
    <LegalPage title="Mentions légales" updatedAt="24 septembre 2026">
      <LegalSection title="Éditeur du site">
        <p>Halisia est édité par <ToComplete>raison sociale et forme juridique (ou nom et prénom si entrepreneur individuel)</ToComplete>.</p>
        <ul>
          <li>Siège social : <ToComplete>adresse</ToComplete></li>
          <li>SIREN / RCS : <ToComplete>numéro d’immatriculation</ToComplete></li>
          <li>Capital social : <ToComplete>montant, le cas échéant</ToComplete></li>
          <li>TVA intracommunautaire : <ToComplete>numéro, le cas échéant</ToComplete></li>
          <li>Contact : <ToComplete>adresse email de contact</ToComplete></li>
          <li>Directeur de la publication : <ToComplete>nom</ToComplete></li>
        </ul>
      </LegalSection>
      <LegalSection title="Hébergement">
        <p>Application hébergée par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis (vercel.com). Base de données et authentification fournies par Supabase Inc. (supabase.com). <ToComplete>vérifier ces prestataires et la région d’hébergement choisie</ToComplete></p>
      </LegalSection>
      <LegalSection title="Nature du service">
        <p>Halisia fournit des analyses de conformité Shariah à titre informatif, à partir de données publiques. Halisia n’est ni un conseiller en investissements financiers, ni un prestataire de services d’investissement, et ne fournit aucune recommandation personnalisée d’achat ou de vente. Les analyses ne constituent pas une fatwa.</p>
      </LegalSection>
      <LegalSection title="Propriété intellectuelle">
        <p>Les contenus du site (textes, interface, marque Halisia) sont protégés. Toute reproduction sans autorisation est interdite. Les données de marché restent la propriété de leurs fournisseurs respectifs.</p>
      </LegalSection>
    </LegalPage>
  );
}
