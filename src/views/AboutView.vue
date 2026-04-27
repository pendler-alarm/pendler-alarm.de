<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const groupImageUrl = 'https://data.deutschebahn.com/resource/blob/13778206/8091c02d1b29574694c2b2e759c30dea/aeh_platz4_OL104605-data.jpg';
</script>

<template>
  <section class="about-view">
    <header class="about-hero">
      <div class="about-copy">
        <p class="about-kicker">{{ t('views.about.kicker') }}</p>
        <h1>{{ t('views.about.title') }}</h1>
        <p>{{ t('views.about.lead') }}</p>
      </div>

      <figure class="about-figure">
        <img :src="groupImageUrl" :alt="t('views.about.imageAlt')" loading="lazy">
        <figcaption class="about-figure__credit">{{ t('views.about.imageCredit') }}</figcaption>
      </figure>
    </header>

    <div class="about-grid">
      <article class="about-card">
        <h2>{{ t('views.about.storyTitle') }}</h2>
        <p>{{ t('views.about.storyBodyOne') }}</p>
        <p>{{ t('views.about.storyBodyTwo') }}</p>
      </article>

      <article class="about-card">
        <h2>{{ t('views.about.visionTitle') }}</h2>
        <p>{{ t('views.about.visionBodyOne') }}</p>
        <p>{{ t('views.about.visionBodyTwo') }}</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.about-view {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 20px 64px;
  display: grid;
  gap: 24px;
}

.about-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
  gap: 24px;
  align-items: center;
}

.about-copy,
.about-card {
  padding: 24px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(10px);
}

.about-kicker {
  margin: 0 0 8px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #0f766e;
}

.about-copy h1,
.about-card h2 {
  margin: 0 0 12px;
  color: #172033;
}

.about-copy p,
.about-card p {
  margin: 0;
  color: rgba(23, 32, 51, 0.82);
  line-height: 1.6;
}

.about-card {
  display: grid;
  gap: 12px;
}

.about-figure {
  margin: 0;
  overflow: hidden;
  border-radius: 24px;
  min-height: 100%;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);
}

.about-figure img {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 320px;
  object-fit: cover;
}

.about-figure__credit {
  margin: 0;
  padding: 12px 16px;
  background: rgba(15, 23, 42, 0.9);
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.85rem;
  line-height: 1.4;
}

.about-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

@media (max-width: 720px) {
  .about-view {
    padding: 18px 14px 40px;
  }

  .about-hero,
  .about-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
