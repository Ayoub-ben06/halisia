import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Méthodologie Shariah — Halisia" };

export default function MethodologyPage() {
  return (
    <LegalPage
      title="Méthodologie Shariah"
      updatedAt="24 septembre 2026"
      intro={<p>Halisia applique aux actions cotées les critères de screening de la norme AAOIFI n°21 (« Financial Paper »), à partir de données financières publiques. Cette page détaille les seuils, les sources, les choix éditoriaux et les limites de l’analyse. <strong>Halisia n’émet pas de fatwa</strong> : en cas de doute, consultez un savant de confiance.</p>}
    >
      <LegalSection title="1. Activité de l’entreprise">
        <p>Une entreprise est non conforme si son activité principale relève d’un secteur interdit : banque et assurance conventionnelles, crédit et courtage, alcool, tabac, jeux d’argent, divertissement pour adultes, armement, et production audiovisuelle ou musicale.</p>
        <p>L’activité est déterminée à partir du code d’activité déclaré à la SEC (actions américaines) ou de la classification sectorielle Yahoo Finance (autres marchés). Les banques et assurances opérant sous gouvernance Shariah (Al Rajhi, Alinma, Dubai Islamic Bank…) ne sont pas exclues à ce titre ; leurs ratios financiers restent appliqués.</p>
      </LegalSection>

      <LegalSection title="2. Ratios financiers">
        <ul>
          <li><strong>Dette portant intérêt</strong> &lt; 30 % de la capitalisation boursière moyenne sur 36 mois.</li>
          <li><strong>Trésorerie et placements portant intérêt</strong> &lt; 30 % de la capitalisation boursière moyenne sur 36 mois. Lorsqu’aucun poste de placement distinct n’est publié, toute la trésorerie est comptée (approche prudente).</li>
          <li><strong>Revenus impurs</strong> (revenus d’intérêts et autres revenus non permis identifiés) ≤ 5 % du chiffre d’affaires des 12 derniers mois.</li>
          <li><strong>Liquidités</strong> &lt; 70 % du total de l’actif.</li>
        </ul>
        <p>La capitalisation moyenne lisse les variations de cours : une baisse temporaire du marché ne fait pas basculer un verdict. La dette provient du dernier rapport trimestriel (10-Q) lorsqu’il a moins de 180 jours, sinon du rapport annuel. Tous les montants sont convertis dans la devise de cotation avant le calcul des ratios.</p>
      </LegalSection>

      <LegalSection title="3. Verdicts">
        <ul>
          <li><strong>Conforme</strong> : activité permise et tous les ratios sous les seuils.</li>
          <li><strong>Douteux</strong> : ratios conformes mais modèle économique discuté entre scholars (publicité, jeux vidéo, services financiers intégrés…), activité dont une part des revenus non permis ne peut pas être quantifiée (hôtellerie, grande distribution…), ou ratio de dette entre 30 % et 33 % (seuil des indices Dow Jones Islamic et S&amp;P Shariah).</li>
          <li><strong>Non conforme</strong> : activité interdite ou au moins un ratio au-dessus du seuil.</li>
          <li><strong>À revoir / données insuffisantes</strong> : une donnée nécessaire est absente ; aucune conclusion n’est tirée.</li>
        </ul>
        <p>Lorsque seul le revenu d’intérêts est introuvable et que tous les autres critères passent, le titre est classé conforme avec une confiance moyenne et une recommandation de vérification.</p>
      </LegalSection>

      <LegalSection title="4. Choix éditoriaux">
        <p>Certaines activités ne sont pas visibles dans les classifications sectorielles. Halisia maintient des listes éditoriales, affichées avec leur justification sur la fiche du titre :</p>
        <ul>
          <li>groupes aéronautiques dont une part significative des revenus provient de l’armement (Boeing, RTX, Airbus, Thales…) ;</li>
          <li>entreprises avec un segment non permis supérieur à 5 % du chiffre d’affaires (vins et spiritueux de LVMH, musique et cinéma de Sony…) ;</li>
          <li>sociétés de services informatiques et éditeurs de logiciels dont une part significative du chiffre d’affaires provient de banques et d’assureurs conventionnels (lecture stricte ; certains scholars l’acceptent car le service informatique est permis en soi) ;</li>
          <li>modèles économiques discutés (publicité, services financiers intégrés).</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Purification">
        <p>Seuls les dividendes sont purifiés, pas les plus-values. Le montant à donner est égal aux dividendes reçus multipliés par la part des revenus impurs de l’entreprise. Les dividendes sont estimés à partir de l’historique par action publié par Yahoo Finance et de la quantité détenue.</p>
        <p>Lorsqu’une action détenue devient non conforme, Halisia applique la règle des 90 jours : 30 jours pour attendre un éventuel retour à la conformité, puis 60 jours pour vendre, avec des rappels par email.</p>
      </LegalSection>

      <LegalSection title="6. Zakat">
        <p>La Zakat (2,5 %) s’applique lorsque le patrimoine zakatable dépasse le nisab : 85 g d’or par défaut, ou 595 g d’argent selon l’école hanafite (réglable dans les préférences). Les cours de l’or et de l’argent sont mis à jour quotidiennement. L’inclusion des crypto-actifs est laissée au choix de l’utilisateur.</p>
      </LegalSection>

      <LegalSection title="7. Sources et limites">
        <ul>
          <li>Rapports financiers XBRL de la SEC (EDGAR) pour les sociétés déposant des 10-K et 10-Q.</li>
          <li>Yahoo Finance pour les cours, les capitalisations, les sociétés hors États-Unis et les dividendes.</li>
        </ul>
        <p>Les données publiques peuvent être incomplètes, retardées ou mal classées ; les activités secondaires et la répartition fine des revenus par segment ne sont pas toujours disponibles. Chaque ratio affiche sa source et sa période pour permettre la vérification. Les résultats sont informatifs et ne constituent ni un conseil en investissement ni une recommandation d’achat ou de vente.</p>
        <p>Vous pouvez tester n’importe quelle action sur le <Link href="/screening" className="text-[#f2ca6e] hover:underline">screener</Link>.</p>
      </LegalSection>
    </LegalPage>
  );
}
