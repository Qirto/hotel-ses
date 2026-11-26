import React from "react";
import Link from "next/link";
import { LegalLayout } from "@/components/app/LegalLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité du personnel et des opérations | Hotel SES",
  description: "Information interne sur la protection des données et l’utilisation des cookies pour le personnel et la gestion opérationnelle de Hotel SES.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout>
        <p className="legal-meta">Date d’entrée en vigueur : octobre 2026 • Version 1.4</p>

        {/* Header */}
        <header>
          <p className="legal-eyebrow">Conformité juridique et protection des données (RGPD / DPDP)</p>
          <h1>
            Politique de confidentialité du personnel et des opérations
          </h1>
          <p>
            La présente politique de confidentialité encadre les traitements de données réalisés au sein de Hotel SES (système de gestion des services et des opérations)
            déployé à l’Hôtel Méditerranée Thalasso Golf Hammamet. Elle précise la manière dont sont gérés les dossiers opérationnels des employés, les demandes d’intervention et les données de séjour des clients.
          </p>
        </header>

        {/* Content Sections */}
        <div>
          <section>
            <h2>
              1. Responsable du traitement et contact pour la protection des données
            </h2>
            <p>
              Le responsable du traitement des données personnelles et opérationnelles traitées dans Hotel SES est :
            </p>
            <div className="legal-callout">
              <p><strong>Entité :</strong> Hôtel Méditerranée Thalasso Golf Hammamet</p>
              <p><strong>Adresse :</strong> Hammamet, Tunisie</p>
              <p>
                <strong>Contact protection des données :</strong>{" "}
                <a href="mailto:contact@hotelmediterraneehammamet.com">
                  contact@hotelmediterraneehammamet.com
                </a>
              </p>
              <p>
                <strong>Support informatique et signalement d’incidents :</strong>{" "}
                <a href="mailto:it-support@grandpalacehotel.com">
                  it-support@grandpalacehotel.com
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2>
              2. Catégories de données collectées
            </h2>
            <p>Hotel SES traite des informations opérationnelles strictement limitées aux tâches de gestion hôtelière :</p>
            <ul>
              <li>
                <strong>Profils et présence du personnel :</strong> nom complet, rôle attribué (réceptionniste, technicien, gouvernante, RH), code de service, numéro de poste interne ou de téléphone, statut de présence en service, compétences et horodatages de pointage.
              </li>
              <li>
                <strong>Demandes d’intervention et de maintenance :</strong> numéro de chambre, description du problème, niveau de priorité (normale, haute, urgente), service destinataire, technicien assigné, notes de résolution et horodatages SLA.
              </li>
              <li>
                <strong>Clients et attribution des chambres :</strong> nom du client, numéro de chambre, dates d’arrivée et de départ, nombre d’adultes et d’enfants (requis pour les protocoles de sécurité et le calcul de la taxe de séjour).
              </li>
              <li>
                <strong>Réclamations confidentielles :</strong> demandes à accès restreint, consultables exclusivement par le directeur général afin de protéger la vie privée des clients et de traiter les retours sensibles.
              </li>
            </ul>
          </section>

          <section>
            <h2>
              3. Bases légales du traitement
            </h2>
            <p>Conformément à l’article 6 du Règlement général sur la protection des données (RGPD), le traitement repose sur les bases suivantes :</p>
            <ul>
              <li>
                <strong>Article 6(1)(b) [nécessité contractuelle] :</strong> exécution des obligations liées au contrat de travail, répartition des horaires et exécution des contrats de prestation hôtelière conclus avec les clients.
              </li>
              <li>
                <strong>Article 6(1)(c) [obligation légale] :</strong> tenue des registres des clients de l’hôtel, des relevés d’effectifs à des fins de sécurité et des relevés d’horaires liés à la santé au travail exigés par la réglementation hôtelière locale.
              </li>
              <li>
                <strong>Article 6(1)(f) [intérêts légitimes] :</strong> efficacité opérationnelle, traitement rapide des interventions de maintenance, protection des biens et contrôle exercé par la direction.
              </li>
            </ul>
          </section>

          <section>
            <h2>
              4. Politique relative aux cookies et technologies de stockage
            </h2>
            <p>
              Hotel SES est un outil opérationnel interne et n’utilise <strong>aucun</strong> cookie publicitaire, traceur marketing ni balise de profilage intersites.
            </p>
            <div className="legal-callout">
              <h3>
                Cookies strictement nécessaires
              </h3>
              <ul>
                <li>
                  <strong>Nom du cookie :</strong> <code>sb-…-auth-token</code> (session Supabase)
                </li>
                <li>
                  <strong>Finalité :</strong> maintient la session du compte personnel connecté ; le rôle du compte (réception, RH, direction, administrateur), signé par le serveur, détermine les espaces et les actions autorisés.
                </li>
                <li>
                  <strong>Durée de conservation :</strong> durée de la session, renouvelée tant que le compte est utilisé (suppression immédiate lors d’une déconnexion explicite).
                </li>
                <li>
                  <strong>Exemption légale :</strong> strictement nécessaire à la sécurité des espaces au sens de l’article 5(3) de la directive ePrivacy ; aucun consentement préalable n’est requis.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2>
              5. Durées de conservation et calendrier d’effacement
            </h2>
            <p>Nous appliquons des principes stricts de minimisation des données :</p>
            <ul>
              <li>
                <strong>Dossiers du personnel :</strong> conservés pendant toute la durée de l’emploi. En cas de départ ou de fin de contrat, les comptes du personnel peuvent être anonymisés depuis l’espace RH.
              </li>
              <li>
                <strong>Historique des incidents :</strong> conservé 12 mois à des fins d’assurance qualité et de planification de la maintenance des installations, après quoi les informations permettant d’identifier les clients sont supprimées.
              </li>
              <li>
                <strong>Données des clients partis :</strong> archivées après règlement du séjour, puis supprimées ou anonymisées dans un délai de 6 mois, sauf si une conservation plus longue est exigée par les obligations fiscales légales.
              </li>
            </ul>
          </section>

          <section>
            <h2>
              6. Vos droits et demandes de suppression
            </h2>
            <p>
              Conformément à la législation applicable en matière de protection des données (articles 15 à 22 du RGPD), toutes les personnes concernées, membres du personnel comme clients, ont le droit de :
            </p>
            <ul>
              <li>Obtenir la confirmation que des données les concernant sont détenues et en recevoir une copie exportée (droit d’accès et droit à la portabilité).</li>
              <li>Obtenir sans délai la rectification de coordonnées ou d’informations de service inexactes.</li>
              <li>Obtenir l’effacement (droit à l’oubli) ou l’anonymisation des données non essentielles.</li>
              <li>S’opposer à certaines opérations de traitement ou en demander la limitation.</li>
            </ul>
            <div className="legal-callout">
              <p>
                Pour exercer vos droits ou demander l’effacement des données de votre compte, contactez directement notre délégué à la protection des données (DPO) à l’adresse{" "}
                <a href="mailto:dpo@grandpalacehotel.com">
                  dpo@grandpalacehotel.com
                </a>
                . Les administrateurs RH peuvent également lancer l’anonymisation d’un dossier du personnel directement depuis l’espace RH.
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="legal-footer">
          <div>
            &copy; {new Date().getFullYear()} Hôtel Méditerranée Thalasso Golf Hammamet • Hotel SES
          </div>
          <div>
            <Link href="/tos">
              Charte d’utilisation
            </Link>
            <Link href="/login">
              Page de connexion
            </Link>
          </div>
        </footer>
    </LegalLayout>
  );
}
