import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, ToComplete } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Politique de confidentialité — Halisia" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      updatedAt="24 septembre 2026"
      intro={<p>Cette politique explique quelles données personnelles Halisia traite, pourquoi, et comment exercer vos droits au titre du Règlement général sur la protection des données (RGPD).</p>}
    >
      <LegalSection title="Responsable du traitement">
        <p><ToComplete>raison sociale, adresse et email de contact de l’éditeur</ToComplete></p>
      </LegalSection>
      <LegalSection title="Données traitées">
        <ul>
          <li><strong>Compte</strong> : adresse email, mot de passe (chiffré par notre prestataire d’authentification), nom, téléphone et photo si vous les renseignez.</li>
          <li><strong>Patrimoine</strong> : positions saisies ou importées (titres, quantités, prix d’achat, dates, compte), transactions, watchlist, alertes et versements de Zakat.</li>
          <li><strong>Préférences</strong> : devise d’affichage, nisab, notifications email.</li>
          <li><strong>Données techniques</strong> : adresse IP et journaux de connexion, utilisés pour la sécurité et la limitation des abus.</li>
        </ul>
        <p>Halisia ne se connecte pas à vos comptes bancaires ou de courtage : seules les données que vous saisissez ou importez sont traitées.</p>
      </LegalSection>
      <LegalSection title="Finalités et bases légales">
        <ul>
          <li>Fournir le service (suivi du portefeuille, screening, Zakat, purification) : exécution du contrat.</li>
          <li>Envoyer les emails que vous activez (résumé quotidien, alertes, rappels) et les alertes de déclassement des titres détenus : exécution du contrat ; vous pouvez désactiver les emails optionnels dans vos paramètres.</li>
          <li>Sécuriser le service et prévenir les abus : intérêt légitime.</li>
        </ul>
      </LegalSection>
      <LegalSection title="Destinataires et sous-traitants">
        <p>Vos données ne sont ni vendues ni louées. Elles sont traitées par nos sous-traitants techniques : Supabase (base de données et authentification), Vercel (hébergement), Resend (envoi d’emails). Les cours et données financières sont obtenus auprès de Yahoo Finance et de la SEC sans leur transmettre vos données personnelles. <ToComplete>vérifier la liste, les régions d’hébergement et les garanties de transfert hors UE (clauses contractuelles types)</ToComplete></p>
      </LegalSection>
      <LegalSection title="Durée de conservation">
        <p>Les données sont conservées tant que votre compte est actif. La suppression du compte depuis Paramètres › Profil efface vos positions, transactions, watchlist et préférences. Les journaux techniques sont conservés au maximum <ToComplete>durée, par exemple 12 mois</ToComplete>.</p>
      </LegalSection>
      <LegalSection title="Cookies">
        <p>Halisia n’utilise que des cookies strictement nécessaires au fonctionnement du service (maintien de votre session de connexion). Aucun cookie publicitaire ni de mesure d’audience n’est déposé ; ces cookies ne nécessitent donc pas de consentement préalable. Si des outils de mesure d’audience sont ajoutés, un bandeau de consentement sera mis en place.</p>
      </LegalSection>
      <LegalSection title="Vos droits">
        <p>Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité. Vous pouvez modifier vos informations et supprimer votre compte directement depuis les <Link href="/settings" className="text-[#f2ca6e] hover:underline">paramètres</Link>, ou écrire à <ToComplete>email de contact</ToComplete>. Vous pouvez également introduire une réclamation auprès de la CNIL (cnil.fr).</p>
      </LegalSection>
    </LegalPage>
  );
}
