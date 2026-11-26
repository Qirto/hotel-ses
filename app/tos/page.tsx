import React from "react";
import Link from "next/link";
import { LegalLayout } from "@/components/app/LegalLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Charte d’utilisation et conditions du système | Hotel SES",
  description: "Conditions d’utilisation et charte d’usage opérationnel de Hotel SES pour le personnel de l’hôtel.",
};

export default function TermsOfServicePage() {
  return (
    <LegalLayout>
        <p className="legal-meta">Date d’entrée en vigueur : octobre 2026 • Version 1.4</p>

        {/* Header */}
        <header>
          <p className="legal-eyebrow">Gouvernance et sécurité du système</p>
          <h1>
            Charte d’utilisation et conditions applicables au personnel
          </h1>
          <p>
            Les présentes conditions définissent les usages autorisés, les obligations de confidentialité et les responsabilités en matière de sécurité de l’ensemble du personnel de l’hôtel accédant à la plateforme Hotel SES.
          </p>
        </header>

        {/* Content Sections */}
        <div>
          <section>
            <h2>
              1. Accès autorisé et périmètre par rôle
            </h2>
            <p>
              Hotel SES est un système de gestion interne strictement réservé aux membres authentifiés du personnel de l’Hôtel Méditerranée Thalasso Golf Hammamet. Les accès sont attribués selon trois niveaux opérationnels :
            </p>
            <ul>
              <li>
                <strong>Réception (<code>/reception</code>) :</strong> personnel de la réception habilité à créer rapidement des demandes d’intervention, à mettre à jour l’état d’occupation des chambres et à suivre les indicateurs de propreté des chambres.
              </li>
              <li>
                <strong>Ressources humaines (<code>/rh</code>) :</strong> personnel RH habilité à gérer les horaires des employés, à tenir à jour le référentiel des services et à réassigner la charge des demandes en cas d’absence.
              </li>
              <li>
                <strong>Direction générale (<code>/gm</code>) :</strong> équipe de direction disposant d’une vue d’ensemble sur les 341 chambres, des analyses de SLA par service, des performances de délai moyen de résolution (MTTR) et des réclamations confidentielles des clients.
              </li>
            </ul>
          </section>

          <section>
            <h2>
              2. Sécurité des identifiants et confidentialité des codes d’accès
            </h2>
            <p>
              Chaque espace est protégé par des codes d’accès définis dans la configuration de l’environnement et par des cookies de session chiffrés. Les utilisateurs doivent respecter strictement les règles suivantes :
            </p>
            <ul>
              <li>
                <strong>Aucun partage des identifiants :</strong> les codes d’accès des services ne doivent jamais être communiqués à des tiers non autorisés ni être notés en évidence sur les postes de travail.
              </li>
              <li>
                <strong>Fermeture explicite de la session :</strong> le personnel doit utiliser la fonction « Se déconnecter » avant de laisser sans surveillance un terminal partagé ou un poste de la réception.
              </li>
              <li>
                <strong>Signalement des incidents :</strong> tout accès non autorisé suspecté ou toute compromission d’identifiants doit être signalé sans délai au support informatique (<a href="mailto:contact@hotelmediterraneehammamet.com">contact@hotelmediterraneehammamet.com</a>).
              </li>
            </ul>
          </section>

          <section>
            <h2>
              3. Vie privée des clients et confidentialité des données
            </h2>
            <p>
              Toutes les informations relatives aux clients (noms, numéros de chambre, demandes d’intervention et réclamations confidentielles) enregistrées dans Hotel SES sont soumises au strict secret professionnel et à la réglementation applicable en matière de protection des données personnelles :
            </p>
            <ul>
              <li>
                Le personnel s’interdit d’extraire, de photographier ou de reproduire les fiches clients à des fins personnelles ou en vue d’une diffusion externe.
              </li>
              <li>
                Les demandes marquées <strong>Confidentielles</strong> sont transmises exclusivement à la direction et ne doivent jamais être évoquées en dehors des canaux de direction prévus à cet effet.
              </li>
            </ul>
          </section>

          <section>
            <h2>
              4. Intégrité du système et surveillance automatisée
            </h2>
            <p>
              L’activité du système, notamment la création des demandes, leur prise en charge et les pointages de présence, est journalisée à des fins d’assurance qualité et de conformité opérationnelle. Toute tentative délibérée de porter atteinte à l’intégrité de la base de données, de contourner les contrôles d’accès aux pages ou de manipuler les délais de SLA est strictement interdite.
            </p>
          </section>
        </div>

        {/* Footer */}
        <footer className="legal-footer">
          <div>
            &copy; {new Date().getFullYear()} Hôtel Méditerranée Thalasso Golf Hammamet • Hotel SES
          </div>
          <div>
            <Link href="/privacy">
              Politique de confidentialité et cookies
            </Link>
            <Link href="/login">
              Page de connexion
            </Link>
          </div>
        </footer>
    </LegalLayout>
  );
}
