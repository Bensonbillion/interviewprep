import Script from "next/script";
import { consentDefaultsScript } from "@/lib/tracking/consent";

/**
 * Server component that renders all tracking scripts in the correct order.
 *
 * Order matters:
 * 1. Consent defaults (inline, before everything)
 * 2. GTM (container manages GA4, Google Ads, LinkedIn tags)
 * 3. Meta Pixel (loaded separately for CAPI dedup)
 *
 * IDs are loaded from env vars so they're never hardcoded.
 * Each script receives a CSP nonce so it is allowed by Content-Security-Policy.
 */
export function AnalyticsScripts({ nonce }: { nonce: string }) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const linkedinPartnerId = process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID;

  return (
    <>
      {/* 1. Consent defaults — MUST fire before GTM */}
      <Script
        id="consent-defaults"
        strategy="beforeInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: consentDefaultsScript() }}
      />

      {/* 2. Google Tag Manager */}
      {gtmId && (
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${gtmId}');
            `,
          }}
        />
      )}

      {/* 3. Meta Pixel */}
      {metaPixelId && (
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${metaPixelId}');
            `,
          }}
        />
      )}

      {/* 4. LinkedIn Insight Tag */}
      {linkedinPartnerId && (
        <Script
          id="linkedin-insight"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              _linkedin_partner_id="${linkedinPartnerId}";
              window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];
              window._linkedin_data_partner_ids.push(_linkedin_partner_id);
              (function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};
              window.lintrk.q=[]}var s=document.getElementsByTagName("script")[0];
              var b=document.createElement("script");b.type="text/javascript";b.async=true;
              b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";
              s.parentNode.insertBefore(b,s);})(window.lintrk);
            `,
          }}
        />
      )}
    </>
  );
}

/**
 * GTM noscript fallback — place in <body> for users with JS disabled.
 */
export function GTMNoScript() {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  if (!gtmId) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}
