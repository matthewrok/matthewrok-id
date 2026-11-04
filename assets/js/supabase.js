// Force the custom domain onto HTTPS before initializing Supabase or making API calls.
if (window.location.hostname === "matthewrok.my.id" && window.location.protocol !== "https:") {
  window.location.replace(
    "https://" + window.location.host +
    window.location.pathname + window.location.search + window.location.hash
  );
} else {
  const SUPABASE_URL = "https://aqiwrgnxwtphhwikqtmn.supabase.co";
  const SUPABASE_KEY = "sb_publishable_t1sQ82_X8C1sxgwgTGeOVw_g5gewmtv";

  const supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
  );

  window.supabaseClient = supabaseClient;
}
