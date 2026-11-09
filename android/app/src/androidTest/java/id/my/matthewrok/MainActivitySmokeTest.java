package id.my.matthewrok;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.webkit.WebView;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.core.app.ActivityScenario;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.concurrent.atomic.AtomicReference;

@RunWith(AndroidJUnit4.class)
public class MainActivitySmokeTest {
    @Test
    public void launchesProductionWebsiteWithSafeWebViewSettings() throws Exception {
        AtomicReference<String> pageUrl = new AtomicReference<>();
        AtomicReference<String> readyState = new AtomicReference<>();
        AtomicReference<Boolean> javascriptEnabled = new AtomicReference<>();
        AtomicReference<Boolean> domStorageEnabled = new AtomicReference<>();
        AtomicReference<Boolean> fileAccessEnabled = new AtomicReference<>();
        AtomicReference<Integer> mixedContentMode = new AtomicReference<>();

        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            for (int attempt = 0; attempt < 60; attempt++) {
                scenario.onActivity(activity -> {
                    WebView webView = activity.findViewById(R.id.web_view);
                    if (webView == null) return;

                    String currentUrl = webView.getUrl();
                    if (currentUrl != null && currentUrl.startsWith("https://matthewrok.my.id/")) {
                        pageUrl.set(currentUrl);
                        javascriptEnabled.set(webView.getSettings().getJavaScriptEnabled());
                        domStorageEnabled.set(webView.getSettings().getDomStorageEnabled());
                        fileAccessEnabled.set(webView.getSettings().getAllowFileAccess());
                        mixedContentMode.set(webView.getSettings().getMixedContentMode());
                        webView.evaluateJavascript("document.readyState", readyState::set);
                    }
                });

                if (pageUrl.get() != null && "complete".equals(readyState.get())) break;
                Thread.sleep(1000);
            }

            assertNotNull("Production website did not load in the WebView", pageUrl.get());
            assertTrue(pageUrl.get().startsWith("https://matthewrok.my.id/"));
            assertEquals(Boolean.TRUE, javascriptEnabled.get());
            assertEquals(Boolean.TRUE, domStorageEnabled.get());
            assertEquals(Boolean.FALSE, fileAccessEnabled.get());
            assertEquals(WebView.MIXED_CONTENT_NEVER_ALLOW, mixedContentMode.get().intValue());
            assertEquals("complete", readyState.get());
        }
    }
}
