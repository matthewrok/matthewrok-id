document.addEventListener("DOMContentLoaded", async () => {
    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("Supabase belum terhubung.");
        return;
    }

    const dashboard = document.querySelector("#adminDashboard");

    if (!dashboard) return;

    const { data: { user }, error: authError } =
        await supabase.auth.getUser();

    if (authError || !user) {
        window.location.href = "../login.html";
        return;
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

    if (profileError || profile?.role !== "admin") {
        alert("Halaman ini khusus admin.");
        window.location.href = "../index.html";
        return;
    }

    const adminName = document.querySelector("#adminName");

    if (adminName) {
        adminName.textContent = profile.full_name || user.email;
    }

    const logoutButton = document.querySelector("#adminLogout");

    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            await supabase.auth.signOut();
            window.location.href = "../login.html";
        });
    }
});
