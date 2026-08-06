import { apps } from "../lib/apps";


export function GET() {

const items = apps.map(app => `

<item>

<title>
${app.name.fa}
</title>

<link>
https://sakhtanie.ir/tools/${app.slug}
</link>

<description>
${app.summary}
</description>

</item>

`).join("");


const xml = `<?xml version="1.0" encoding="UTF-8"?>

<rss version="2.0">

<channel>

<title>
ساختنیه؟
</title>

<link>
https://sakhtanie.ir
</link>

<description>
بررسی ابزارهایی که می‌شود با AI ساخت.
</description>

${items}

</channel>

</rss>
`;


return new Response(
xml,
{
headers:{
"Content-Type":"application/xml"
}
}
);

}
