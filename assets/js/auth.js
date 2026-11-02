document.addEventListener("DOMContentLoaded", () => {
    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("Supabase belum terhubung.");
        return;
    }

    // REGISTER
    const registerForm = document.querySelector("#registerForm");

    if (registerForm) {
        registerForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const email = document.querySelector("#registerEmail").value.trim();
            const password = document.querySelector("#registerPassword").value;
            const fullName = document.querySelector("#registerName").value.trim();
            const message = document.querySelector("#authMessage");

            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });

            message.textContent = error
                ? error.message
                : "Pendaftaran berhasil. Silakan periksa email untuk konfirmasi.";
        });
    }

    // LOGIN
    const loginForm = document.querySelector("#loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const email = document.querySelector("#loginEmail").value.trim();
            const password = document.querySelector("#loginPassword").value;
            const message = document.querySelector("#authMessage");

            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                message.textContent = error.message;
                return;
            }

            window.location.href = "index.html";
        });
    }
});
