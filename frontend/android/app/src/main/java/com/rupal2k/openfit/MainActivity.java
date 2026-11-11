package com.rupal2k.openfit;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PrivacyScreenPlugin.class);   // local plugin: FLAG_SECURE for blood tests
        super.onCreate(savedInstanceState);
        // picked files reach the WebView as our own cached copies (PNG picks failed on Samsung)
        PickCopyChromeClient.clear(this);
        if (getBridge() != null && getBridge().getWebView() != null) getBridge().getWebView().setWebChromeClient(new PickCopyChromeClient(getBridge()));
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() != null && getBridge().getWebView() != null && getBridge().getWebView().canGoBack()) {
                    getBridge().getWebView().goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });
    }
}
