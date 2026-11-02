const SUPABASE_URL = "https://aqiwrgnxwtphhwikqtmn.supabase.co";

const SUPABASE_KEY = "sb_publishable_t1sQ82_X8C1sxgwgTGeOVw_g5gewmtv";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

window.supabaseClient = supabaseClient;
