    /* Shared Supabase client */
    const db = window.supabaseClient;


    /* ELEMENT REFERENCES */

    const authScreen =
      document.getElementById("authScreen");

    const site =
      document.getElementById("site");

    const authForm =
      document.getElementById("authForm");

    const nameField =
      document.getElementById("nameField");

    const fullName =
      document.getElementById("fullName");

    const email =
      document.getElementById("email");

    const password =
      document.getElementById("password");

    const submitButton =
      document.getElementById("submitButton");

    const authMessage =
      document.getElementById("authMessage");


    /* AUTH MODE */

    let mode = "login";


    /* SWITCH LOGIN / REGISTER */

    document
      .getElementById("switchMode")
      .addEventListener("click", () => {

        mode = mode === "login"
          ? "register"
          : "login";

        nameField.classList.toggle(
          "hidden",
          mode !== "register"
        );

        fullName.required =
          mode === "register";

        fullName.autocomplete =
          "name";

        password.autocomplete =
          mode === "login"
            ? "current-password"
            : "new-password";

        submitButton.textContent =
          mode === "login"
            ? "LOGIN"
            : "CREATE ACCOUNT";

        document
          .getElementById("switchText")
          .textContent =
            mode === "login"
              ? "Belum punya akun?"
              : "Sudah punya akun?";

        document
          .getElementById("switchMode")
          .textContent =
            mode === "login"
              ? "Daftar sekarang"
              : "Login";

        showMessage("");

      });


    /* AUTH MESSAGE */

    function showMessage(message, type = "") {

      authMessage.textContent = message;

      authMessage.className = type;

    }

    let resendVerificationButton = null;
    function showResendVerification(emailAddress) {
      if (!resendVerificationButton) {
        resendVerificationButton = document.createElement("button");
        resendVerificationButton.type = "button";
        resendVerificationButton.textContent = "KIRIM ULANG EMAIL VERIFIKASI";
        resendVerificationButton.style.cssText = "display:block;width:100%;margin-top:12px;padding:12px;border:1px solid #d8b878;border-radius:8px;background:rgba(216,184,120,.12);color:#f0d6a0;font-weight:700;cursor:pointer";
        authMessage.insertAdjacentElement("afterend", resendVerificationButton);
        resendVerificationButton.addEventListener("click", async () => {
          resendVerificationButton.disabled = true;
          resendVerificationButton.textContent = "MENGIRIM...";
          try {
            const { error } = await db.auth.resend({
              type: "signup",
              email: resendVerificationButton.dataset.email,
              options: { emailRedirectTo: "https://matthewrok.my.id/email-confirmed.html" }
            });
            if (error) throw error;
            showMessage("Jika akun menunggu verifikasi, link baru telah dikirim. Periksa Gmail dan folder Spam.", "success");
          } catch (error) {
            showMessage(error.message || "Link verifikasi gagal dikirim. Coba lagi beberapa menit.", "error");
          } finally {
            resendVerificationButton.disabled = false;
            resendVerificationButton.textContent = "KIRIM ULANG EMAIL VERIFIKASI";
          }
        });
      }
      resendVerificationButton.dataset.email = emailAddress;
      resendVerificationButton.hidden = false;
    }


    /* LOGIN AND REGISTER */

    authForm.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();

        submitButton.disabled = true;

        submitButton.textContent =
          "PLEASE WAIT...";

        showMessage("");
        if (resendVerificationButton) resendVerificationButton.hidden = true;

        try {

          if (mode === "register") {

            const { data, error } =
              await db.auth.signUp({

                email: email.value.trim(),

                password: password.value,

                options: {

                  data: {
                    full_name: fullName.value.trim()
                  },

                  emailRedirectTo:
                    "https://matthewrok.my.id/email-confirmed.html"

                }

              });

            if (error) {
              throw error;
            }

            if (data.session) {
              await db.auth.signOut({ scope: "local" });
            }
            showMessage(
              "Pendaftaran berhasil. Buka Gmail dan klik link verifikasi. Setelah terverifikasi, kembali ke halaman login dan masuk secara manual.",
              "success"
            );
            showResendVerification(email.value.trim());

          } else {

            const { error } =
              await db.auth.signInWithPassword({

                email: email.value.trim(),

                password: password.value

              });

            if (error) {
              throw error;
            }
            sessionStorage.removeItem("matthewVisitorName");

          }

        } catch (error) {

          showMessage(
            error.message || "Terjadi kesalahan.",
            "error"
          );
          if (mode === "login" && String(error.message || "").toLowerCase().includes("email not confirmed")) {
            showResendVerification(email.value.trim());
          }

        } finally {

          submitButton.disabled = false;

          submitButton.textContent =
            mode === "login"
              ? "LOGIN"
              : "CREATE ACCOUNT";

        }

      }
    );


    /* VISITOR ACCESS — no Supabase Auth account/session */
    const homeVisitorForm = document.getElementById("homeVisitorForm");
    homeVisitorForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const visitorInput = document.getElementById("homeVisitorName");
      const visitorName = visitorInput.value.trim().replace(/\\s+/g, " ");
      const visitorButton = document.getElementById("homeVisitorButton");
      if (visitorName.length < 2) {
        showMessage("Nama wajib diisi minimal 2 karakter.", "error");
        return;
      }
      visitorButton.disabled = true;
      visitorButton.textContent = "MENYIAPKAN AKSES...";
      try {
        const { error } = await db.from("visitor_logs").insert({ visitor_name: visitorName });
        if (error) throw error;
        sessionStorage.setItem("matthewVisitorName", visitorName);
        localStorage.setItem("matthewLastActivity", String(Date.now()));
        showMessage("Akses visitor berhasil disiapkan.", "success");
        await showUser(null);
      } catch (error) {
        console.error("Visitor access error:", error);
        showMessage("Akses visitor belum dapat dicatat. Coba lagi beberapa saat.", "error");
        visitorButton.disabled = false;
        visitorButton.textContent = "MASUK SEBAGAI TAMU";
      }
    });


    /* INTERSECTION OBSERVER */

    const observer =
      new IntersectionObserver(
        (entries) => {

          entries.forEach((entry) => {

            if (entry.isIntersecting) {

              entry.target.classList.add("show");

              observer.unobserve(entry.target);

            }

          });

        },
        {
          threshold: 0.12
        }
      );


    /* SHOW USER WEBSITE */

    async function showUser(user) {

      const adminNavLink = document.getElementById("adminNavLink");
      if (adminNavLink) {
        adminNavLink.style.display = "none";
        adminNavLink.setAttribute("aria-hidden", "true");
      }

      if (!user) {
        const visitorName = sessionStorage.getItem("matthewVisitorName");
        if (visitorName) {
          authScreen.classList.add("hidden");
          site.classList.remove("hidden");
          document.getElementById("navUser").textContent = "Tamu: " + visitorName;
          document.getElementById("adminPanel")?.classList.add("hidden");
          document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
          return;
        }
        authScreen.classList.remove("hidden");
        site.classList.add("hidden");
        return;
      }

      const { data: profile, error } =
        await db
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();

      if (error || !profile) {

        showMessage(
          "Profil belum tersedia. Coba login kembali.",
          "error"
        );

        await db.auth.signOut();

        return;

      }

      authScreen.classList.add("hidden");

      site.classList.remove("hidden");

      const navUser = document.getElementById("navUser");
      navUser.replaceChildren();

      const navEmail = document.createElement("span");
      navEmail.className = "nav-user-email";
      navEmail.textContent = user.email || profile.full_name || "Akun";
      navUser.appendChild(navEmail);

      const roleLabels = {
        admin: "ADMIN",
        member: "MEMBER",
        SULTAN: "SULTAN",
        MATTHEW: "MATTHEW",
        PELANGGAN: "PELANGGAN"
      };
      const navRole = document.createElement("span");
      navRole.className = "nav-user-role" + (profile.role === "admin" ? " is-admin" : "");
      navRole.textContent = roleLabels[profile.role] || String(profile.role || "MEMBER").toUpperCase();
      navRole.setAttribute("aria-label", "Role akun: " + navRole.textContent);
      navUser.appendChild(navRole);


      /* ADMIN ACCESS */

      const adminPanel =
        document.getElementById("adminPanel");

      if (profile.role === "admin") {

        if (adminNavLink) {
          adminNavLink.style.display = "flex";
          adminNavLink.setAttribute("aria-hidden", "false");
        }

        adminPanel.classList.remove("hidden");

        loadMembers();

      } else {

        adminPanel.classList.add("hidden");

      }


      /* REVEAL ANIMATIONS */

      document
        .querySelectorAll(".reveal")
        .forEach((element) => {

          observer.observe(element);

        });

    }


    /* LOAD ADMIN MEMBERS */

    async function loadMembers() {

      const rows =
        document.getElementById("memberRows");

      const message =
        document.getElementById("memberMessage");

      rows.innerHTML = "";

      message.textContent =
        "Memuat data member...";

      const { data, error } =
        await db
          .from("profiles")
          .select("full_name, role, created_at")
          .order("created_at", {
            ascending: false
          });

      if (error) {

        message.textContent =
          "Gagal memuat data: " + error.message;

        return;

      }

      message.textContent =
        "Total akun: " + data.length;

      data.forEach((member) => {

        const tr =
          document.createElement("tr");

        const values = [

          member.full_name || "Tanpa nama",

          member.role || "-",

          member.created_at
            ? new Date(
                member.created_at
              ).toLocaleDateString("id-ID")
            : "-"

        ];

        values.forEach((value) => {

          const td =
            document.createElement("td");

          td.textContent = value;

          tr.appendChild(td);

        });

        rows.appendChild(tr);

      });

    }


    /* LOGOUT */

    document
      .getElementById("logout")
      .addEventListener("click", async () => {

        if (sessionStorage.getItem("matthewVisitorName")) {
          sessionStorage.removeItem("matthewVisitorName");
          localStorage.removeItem("matthewLastActivity");
          window.location.replace("login.html");
          return;
        }
        const { error } = await db.auth.signOut();

        if (error) {

          showMessage(
            "Gagal logout: " + error.message,
            "error"
          );

        }

      });


    /* AUTH STATE LISTENER */

    db.auth.onAuthStateChange(
      (event, session) => {

        if (event === "INITIAL_SESSION") {
          return;
        }

        setTimeout(() => {

          showUser(
            session?.user || null
          );

        }, 0);

      }
    );


    /* CHECK EXISTING SESSION */

    (async () => {

      const {
        data: { session },
        error
      } = await db.auth.getSession();

      if (error) {

        showMessage(
          "Gagal memeriksa sesi login.",
          "error"
        );

        return;

      }

      await showUser(
        session?.user || null
      );

    })();
