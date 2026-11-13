package id.my.matthewrok;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import android.app.AlertDialog;

public class MainActivity extends Activity {
    private static final String HOME_URL = "https://matthewrok.my.id/";
    private static final int FILE_CHOOSER_REQUEST = 4102;

    private WebView webView;
    private android.webkit.ValueCallback<Uri[]> filePathCallback;
    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;
    private AlertDialog offlineDialog;
    private android.widget.Button refreshButton;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(getColor(R.color.navy));
        getWindow().setNavigationBarColor(getColor(R.color.navy));
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.web_view);
        connectivityManager = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        registerConnectivityListener();
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new MatthewWebViewClient());
        webView.setWebChromeClient(new MatthewWebChromeClient());
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            openExternal(url);
        });

        // Instrumentation smoke tests can verify native WebView configuration without
        // depending on external DNS, TLS, or the production website being reachable.
        boolean skipInitialLoadForTest = BuildConfig.DEBUG
                && getIntent().getBooleanExtra("id.my.matthewrok.SKIP_INITIAL_LOAD_FOR_TESTS", false);
        if (!skipInitialLoadForTest) {
            if (!hasInternetConnection()) {
                showOfflineDialog();
            } else if (savedInstanceState == null) {
                webView.loadUrl(HOME_URL);
            } else {
                webView.restoreState(savedInstanceState);
            }
        }

        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
    }

    private boolean hasInternetConnection() {
        if (connectivityManager == null) return false;
        Network active = connectivityManager.getActiveNetwork();
        if (active == null) return false;
        NetworkCapabilities capabilities = connectivityManager.getNetworkCapabilities(active);
        return capabilities != null
                && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
    }

    private void registerConnectivityListener() {
        if (connectivityManager == null) return;
        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(Network network) {
                runOnUiThread(() -> updateRefreshButton());
            }

            @Override
            public void onLost(Network network) {
                runOnUiThread(() -> {
                    if (!hasInternetConnection()) showOfflineDialog();
                    else updateRefreshButton();
                });
            }

            @Override
            public void onCapabilitiesChanged(Network network, NetworkCapabilities capabilities) {
                runOnUiThread(() -> updateRefreshButton());
            }
        };
        try {
            NetworkRequest request = new NetworkRequest.Builder()
                    .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                    .build();
            connectivityManager.registerNetworkCallback(request, networkCallback);
        } catch (RuntimeException ignored) {
            networkCallback = null;
        }
    }

    private void showOfflineDialog() {
        if (isFinishing() || isDestroyed() || (offlineDialog != null && offlineDialog.isShowing())) {
            updateRefreshButton();
            return;
        }
        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle("Tidak ada koneksi internet")
                .setMessage("Login gagal diproses karena perangkat tidak terhubung ke internet. Periksa Wi-Fi atau data seluler, lalu tekan Segarkan.")
                .setCancelable(false)
                .setPositiveButton("↻ Segarkan", null)
                .create();
        offlineDialog = dialog;
        dialog.setOnShowListener(ignored -> {
            refreshButton = dialog.getButton(AlertDialog.BUTTON_POSITIVE);
            refreshButton.setOnClickListener(view -> {
                if (!hasInternetConnection()) {
                    Toast.makeText(this, "Koneksi internet belum tersedia.", Toast.LENGTH_SHORT).show();
                    return;
                }
                dialog.dismiss();
                offlineDialog = null;
                refreshButton = null;
                if (webView != null) {
                    String current = webView.getUrl();
                    if (current == null || current.isEmpty()) webView.loadUrl(HOME_URL);
                    else webView.reload();
                }
            });
            updateRefreshButton();
        });
        dialog.setOnDismissListener(ignored -> {
            if (offlineDialog == dialog) {
                offlineDialog = null;
                refreshButton = null;
            }
        });
        dialog.show();
    }

    private void updateRefreshButton() {
        if (refreshButton != null) {
            boolean connected = hasInternetConnection();
            refreshButton.setEnabled(connected);
            refreshButton.setAlpha(connected ? 1.0f : 0.55f);
        }
    }

    private boolean isFirstParty(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme();
        String host = uri.getHost();
        if (!"https".equalsIgnoreCase(scheme) || host == null) return false;
        return host.equalsIgnoreCase("matthewrok.my.id")
                || host.equalsIgnoreCase("www.matthewrok.my.id");
    }

    private void openExternal(String url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            startActivity(intent);
        } catch (ActivityNotFoundException ignored) {
            Toast.makeText(this, R.string.no_app_found, Toast.LENGTH_SHORT).show();
        }
    }

    private class MatthewWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isFirstParty(uri)) return false;

            String scheme = uri.getScheme();
            if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)
                    || "mailto".equalsIgnoreCase(scheme) || "tel".equalsIgnoreCase(scheme)
                    || "whatsapp".equalsIgnoreCase(scheme)) {
                openExternal(uri.toString());
                return true;
            }

            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            super.onPageStarted(view, url, favicon);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            super.onReceivedError(view, request, error);
            if (request.isForMainFrame()) {
                if (!hasInternetConnection()) {
                    showOfflineDialog();
                } else {
                    Toast.makeText(MainActivity.this, R.string.connection_error, Toast.LENGTH_LONG).show();
                }
            }
        }

        @Override
        public void onReceivedSslError(WebView view, android.webkit.SslErrorHandler handler,
                                       android.net.http.SslError error) {
            handler.cancel();
        }
    }

    private class MatthewWebChromeClient extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view,
                android.webkit.ValueCallback<Uri[]> callback,
                FileChooserParams params) {
            if (filePathCallback != null) filePathCallback.onReceiveValue(null);
            filePathCallback = callback;

            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("*/*");
            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            try {
                startActivityForResult(intent, FILE_CHOOSER_REQUEST);
            } catch (ActivityNotFoundException exception) {
                filePathCallback = null;
                Toast.makeText(MainActivity.this, R.string.file_picker_unavailable, Toast.LENGTH_SHORT).show();
                return false;
            }
            return true;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || filePathCallback == null) return;

        Uri[] results = null;
        if (resultCode == Activity.RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                results = new Uri[count];
                for (int i = 0; i < count; i++) {
                    results[i] = data.getClipData().getItemAt(i).getUri();
                }
            } else if (data.getData() != null) {
                results = new Uri[]{data.getData()};
            }
        }

        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        if (connectivityManager != null && networkCallback != null) {
            try { connectivityManager.unregisterNetworkCallback(networkCallback); } catch (RuntimeException ignored) { }
            networkCallback = null;
        }
        if (offlineDialog != null && offlineDialog.isShowing()) offlineDialog.dismiss();
        if (filePathCallback != null) {
            filePathCallback.onReceiveValue(null);
            filePathCallback = null;
        }
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
