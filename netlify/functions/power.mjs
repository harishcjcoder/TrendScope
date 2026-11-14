export default async (req, context) => {
  const url = new URL(req.url);
  const lat = url.searchParams.get("lat") || "13.08";
  const lon = url.searchParams.get("lon") || "80.27";
  const variable = url.searchParams.get("var") || "T2M";
  const start = url.searchParams.get("start") || "2001";
  const end = url.searchParams.get("end") || "2024";

  const targetUrl = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=${variable}&community=AG&longitude=${lon}&latitude=${lat}&format=JSON&start=${start}&end=${end}`;

  try {
    const res = await fetch(targetUrl);
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
