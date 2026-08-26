import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DistributedConceptsApp } from "@/app/page";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getLessonBySlug } from "@/lib/curriculum-runtime";
import { STEPS } from "@/lib/steps";

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
  const lesson = getLessonBySlug(slug);
  if (!lesson) return {};
  const url = `/lessons/${lesson.slug}`;

  return {
    title: lesson.title,
    description: lesson.summary,
    alternates: { canonical: url },
    openGraph: {
      title: `${lesson.title} | ${SITE_NAME}`,
      description: lesson.summary,
      url,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${lesson.title} | ${SITE_NAME}`,
      description: lesson.summary,
    },
  };
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug } = await params;
  const lesson = getLessonBySlug(slug);
  if (!lesson) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: lesson.title,
    description: lesson.summary,
    url: `${SITE_URL}/lessons/${lesson.slug}`,
    learningResourceType: "Interactive lesson",
    educationalLevel: "Beginner",
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
      <DistributedConceptsApp initialLessonId={lesson.id} />
    </>
  );
}
