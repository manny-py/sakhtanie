import assert from "node:assert/strict";
import test from "node:test";

import { escapeXml, renderRss } from "../src/lib/rss.ts";

test("escapeXml escapes every XML special character", () => {
  assert.equal(
    escapeXml(`&<>"'`),
    "&amp;&lt;&gt;&quot;&apos;"
  );
});

test("renderRss escapes catalog text and attempted markup injection", () => {
  const xml = renderRss([
    {
      slug: "safe-tool",
      name: {
        fa: `نام & <ابزار> "ویژه" 'آزمایشی' </title><script>alert(1)</script>`,
        en: "Safe Tool",
      },
      summary: `خلاصه </description><item><title>تزریق</title></item> & more`,
    },
  ]);

  assert.match(xml, /نام &amp; &lt;ابزار&gt; &quot;ویژه&quot; &apos;آزمایشی&apos;/);
  assert.match(xml, /&lt;\/title&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(xml, /&lt;\/description&gt;&lt;item&gt;&lt;title&gt;تزریق&lt;\/title&gt;&lt;\/item&gt; &amp; more/);
  assert.equal((xml.match(/<item>/g) ?? []).length, 1);
  assert.equal(xml.includes("<script>"), false);
});
