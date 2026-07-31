import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DistributedConceptsApp } from "@/app/page";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getStepIndexBySlug, STEPS } from "@/lib/steps";

interface LessonPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return STEPS.map((step) => ({ slug: step.slug }));
}

export async function generateMetadata({
  params,
}: LessonPageProps): Promise<Metadata> {
  const { slug } = await params;
  const stepIndex = getStepIndexBySlug(slug);
  if (stepIndex < 0) return {};

  const lesson = STEPS[stepIndex];
  const url = `/lessons/${lesson.slug}`;

  return {
    title: lesson.title,
    description: lesson.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${lesson.title} | ${SITE_NAME}`,
      description: lesson.description,
      url,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${lesson.title} | ${SITE_NAME}`,
      description: lesson.description,
    },
  };
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug } = await params;
  const stepIndex = getStepIndexBySlug(slug);
  if (stepIndex < 0) notFound();

  const lesson = STEPS[stepIndex];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: lesson.title,
    description: lesson.description,
    url: `${SITE_URL}/lessons/${lesson.slug}`,
    learningResourceType: "Interactive lesson",
    educationalLevel: "Intermediate",
    isPartOf: {
      "@type": "Course",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DistributedConceptsApp initialStep={stepIndex} />
    </>
  );
}
