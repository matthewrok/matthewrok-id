package id.my.matthewrok;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

import android.content.Intent;
import android.webkit.WebView;
import android.webkit.WebSettings;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class MainActivitySmokeTest {
    @Test
    public void launchesWithSafeWebViewSettingsWithoutExternalNetworkDependency() {
        Intent launchIntent = new Intent(
                androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().getTargetContext(),
                MainActivity.class
        );
        launchIntent.putExtra("id.my.matthewrok.SKIP_INITIAL_LOAD_FOR_TESTS", true);

        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(launchIntent)) {
            scenario.onActivity(activity -> {
                WebView webView = activity.findViewById(R.id.web_view);
                assertNotNull("MainActivity should create its WebView", webView);
                WebSettings settings = webView.getSettings();

                assertEquals(true, settings.getJavaScriptEnabled());
                assertEquals(true, settings.getDomStorageEnabled());
                assertEquals(false, settings.getAllowFileAccess());
                assertEquals(
                        WebSettings.MIXED_CONTENT_NEVER_ALLOW,
                        settings.getMixedContentMode()
                );
            });
        }
    }
}
