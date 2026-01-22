# AI Ad Network Frontend SDK - Component Documentation

> Generated from Storybook stories

## Table of Contents

1. [ActionCardAd](#actioncardad)
2. [FollowUpAd](#followupad)
3. [LeadGenAd](#leadgenad)
4. [SponsoredSource](#sponsoredsource)
5. [StaticAd](#staticad)
6. [SuffixAd](#suffixad)
7. [AdAnalyticsDashboard](#adanalyticsdashboard)

---

## ActionCardAd

**Category:** Ad Components

# ActionCardAd

**Category:** Ad Components/Card Ads

**Variants:** horizontal, vertical, compact

## Overview

ActionCardAd is a React component for displaying native ads in AI chat interfaces.

## Available Stories (11)

- **SonyHeadphonesHorizontal** (variant: horizontal)
- **SonyHeadphonesVertical** (variant: vertical)
- **AppleAirPodsCompact** (variant: compact)
- **MacBookVertical** (variant: vertical)
- **LinearToolHorizontal** (variant: horizontal)
- **NikeShoesCompact** (variant: compact)
- **NoImage**
- **Loading** (variant: horizontal)
- **ElectronicsShowcase**
- **SaaSProducts**
- **AllVariants**


### Props

| Prop | Type | Required | Description | Default |
|------|------|----------|-------------|----------|
| variant | enum | No | Visual style variant of the component | `horizontal` |

### Variants

- `horizontal`
- `vertical`
- `compact`

### Story Examples

#### SonyHeadphonesHorizontal

**Args:**
```typescript
{
  "variant": "horizontal"
}
```

#### SonyHeadphonesVertical

**Args:**
```typescript
{
  "variant": "vertical"
}
```

#### AppleAirPodsCompact

**Args:**
```typescript
{
  "variant": "compact"
}
```

#### MacBookVertical

**Args:**
```typescript
{
  "variant": "vertical"
}
```

#### LinearToolHorizontal

**Args:**
```typescript
{
  "variant": "horizontal"
}
```

#### NikeShoesCompact

**Args:**
```typescript
{
  "variant": "compact"
}
```

#### NoImage

#### Loading

**Args:**
```typescript
{
  "variant": "horizontal"
}
```

#### ElectronicsShowcase

#### SaaSProducts

#### AllVariants

### Usage

```tsx
import { ActionCardAd } from '@ai-ad-network/frontend-sdk';

// Example usage
<ActionCardAd
  variant="horizontal"
/>
```

---

## FollowUpAd

**Category:** Ad Components

# FollowUpAd

**Category:** Ad Components/Follow-up Ads

**Variants:** bubble, pill, underline

## Overview

FollowUpAd is a React component for displaying native ads in AI chat interfaces.

## Available Stories (8)

- **Bubble** (variant: bubble)
- **Pill** (variant: pill)
- **Underline** (variant: underline)
- **MixedWithNotion**
- **MixedAtStart**
- **MixedNoAd**
- **MultipleFollowUpSections**
- **ChatInterface**


### Props

| Prop | Type | Required | Description | Default |
|------|------|----------|-------------|----------|
| variant | enum | No | Visual style variant of the component | `bubble` |

### Variants

- `bubble`
- `pill`
- `underline`

### Story Examples

#### Bubble

**Args:**
```typescript
{
  "variant": "bubble"
}
```

#### Pill

**Args:**
```typescript
{
  "variant": "pill"
}
```

#### Underline

**Args:**
```typescript
{
  "variant": "underline"
}
```

#### MixedWithNotion

#### MixedAtStart

#### MixedNoAd

#### MultipleFollowUpSections

#### ChatInterface

### Usage

```tsx
import { FollowUpAd } from '@ai-ad-network/frontend-sdk';

// Example usage
<FollowUpAd
  variant="bubble"
/>
```

---

## LeadGenAd

**Category:** Ad Components

# LeadGenAd

**Category:** Ad Components/Lead Generation

## Overview

LeadGenAd is a React component for displaying native ads in AI chat interfaces.

## Available Stories (10)

- **EmailOnly**
- **EmailAndName**
- **FullForm**
- **AllFields**
- **Compact**
- **Minimal**
- **SaaSNewsletter**
- **EcommerceDeals**
- **DesignResources**
- **AllVariants**


### Story Examples

#### EmailOnly

#### EmailAndName

#### FullForm

#### AllFields

#### Compact

#### Minimal

#### SaaSNewsletter

#### EcommerceDeals

#### DesignResources

#### AllVariants

### Usage

```tsx
import { LeadGenAd } from '@ai-ad-network/frontend-sdk';

// Example usage
<LeadGenAd
/>
```

---

## SponsoredSource

**Category:** Ad Components

# SponsoredSource

**Category:** Ad Components/Sponsored Sources

**Variants:** card, minimal

## Overview

SponsoredSource is a React component for displaying native ads in AI chat interfaces.

## Available Stories (10)

- **Card** (variant: card)
- **ListItem**
- **Minimal** (variant: minimal)
- **NoImage**
- **SourceList**
- **SourceListAtStart**
- **SourceListNoAd**
- **CardVariantList**
- **CompactMinimal**
- **ResearchSources**


### Props

| Prop | Type | Required | Description | Default |
|------|------|----------|-------------|----------|
| variant | enum | No | Visual style variant of the component | `card` |

### Variants

- `card`
- `minimal`

### Story Examples

#### Card

**Args:**
```typescript
{
  "variant": "card"
}
```

#### ListItem

#### Minimal

**Args:**
```typescript
{
  "variant": "minimal"
}
```

#### NoImage

#### SourceList

#### SourceListAtStart

#### SourceListNoAd

#### CardVariantList

#### CompactMinimal

#### ResearchSources

### Usage

```tsx
import { SponsoredSource } from '@ai-ad-network/frontend-sdk';

// Example usage
<SponsoredSource
  variant="card"
/>
```

---

## StaticAd

**Category:** Ad Components

# StaticAd

**Category:** Ad Components/Static Banners

## Overview

StaticAd is a React component for displaying native ads in AI chat interfaces.

## Available Stories (16)

- **MediumRectangle**
- **Leaderboard**
- **Skyscraper**
- **LargeRectangle**
- **MobileBanner**
- **Banner**
- **Dismissible**
- **CustomSize**
- **NoImage**
- **MultipleAds**
- **ContainerHorizontal**
- **Placeholder**
- **IABPresets**
- **WithRefresh**
- **ElectronicsAds**
- **ProgrammaticAds**


### Story Examples

#### MediumRectangle

#### Leaderboard

#### Skyscraper

#### LargeRectangle

#### MobileBanner

#### Banner

#### Dismissible

#### CustomSize

#### NoImage

#### MultipleAds

#### ContainerHorizontal

#### Placeholder

#### IABPresets

#### WithRefresh

#### ElectronicsAds

#### ProgrammaticAds

### Usage

```tsx
import { StaticAd } from '@ai-ad-network/frontend-sdk';

// Example usage
<StaticAd
/>
```

---

## SuffixAd

**Category:** Ad Components

# SuffixAd

**Category:** Ad Components/Suffix Ads

**Variants:** block, inline, minimal

## Overview

SuffixAd is a React component for displaying native ads in AI chat interfaces.

## Available Stories (8)

- **CanvaBlock** (variant: block)
- **GrammarlyInline** (variant: inline)
- **CanvaMinimal** (variant: minimal)
- **WithImage** (variant: block)
- **ShortContext** (variant: block)
- **LongContext** (variant: block)
- **MultipleSuffixAds**
- **AllVariants**


### Props

| Prop | Type | Required | Description | Default |
|------|------|----------|-------------|----------|
| variant | enum | No | Visual style variant of the component | `block` |

### Variants

- `block`
- `inline`
- `minimal`

### Story Examples

#### CanvaBlock

**Args:**
```typescript
{
  "variant": "block"
}
```

#### GrammarlyInline

**Args:**
```typescript
{
  "variant": "inline"
}
```

#### CanvaMinimal

**Args:**
```typescript
{
  "variant": "minimal"
}
```

#### WithImage

**Args:**
```typescript
{
  "variant": "block"
}
```

#### ShortContext

**Args:**
```typescript
{
  "variant": "block"
}
```

#### LongContext

**Args:**
```typescript
{
  "variant": "block"
}
```

#### MultipleSuffixAds

#### AllVariants

### Usage

```tsx
import { SuffixAd } from '@ai-ad-network/frontend-sdk';

// Example usage
<SuffixAd
  variant="block"
/>
```

---

## AdAnalyticsDashboard

**Category:** Analytics

# AdAnalyticsDashboard

**Category:** Analytics/Dashboard

## Overview

AdAnalyticsDashboard is a React component for displaying native ads in AI chat interfaces.

## Available Stories (13)

- **Default**
- **NoRevenue**
- **NoSourceBreakdown**
- **Minimal**
- **WithRefresh**
- **HighPerformingAds**
- **LowPerformingAds**
- **BySource**
- **FullDashboard**
- **CustomTitle**
- **DashboardCard**
- **EmptyState**
- **SingleAd**


### Story Examples

#### Default

#### NoRevenue

#### NoSourceBreakdown

#### Minimal

#### WithRefresh

#### HighPerformingAds

#### LowPerformingAds

#### BySource

#### FullDashboard

#### CustomTitle

#### DashboardCard

#### EmptyState

#### SingleAd

### Usage

```tsx
import { AdAnalyticsDashboard } from '@ai-ad-network/frontend-sdk';

// Example usage
<AdAnalyticsDashboard
/>
```

---

