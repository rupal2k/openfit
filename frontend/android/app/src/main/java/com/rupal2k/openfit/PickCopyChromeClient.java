package com.rupal2k.openfit;

import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.provider.OpenableColumns;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import androidx.core.content.FileProvider;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * Capacitor's file chooser, but every picked file is first copied into the app cache and handed to
 * the WebView from our own FileProvider. The system photo picker serves some images (PNG on
 * Samsung, Android 16) as a stream whose length differs from the size it reports; Chromium then
 * refuses the read as "file changed" (NotReadableError) and the pick is lost. A copy has one size.
 * Camera captures already come from our FileProvider and pass through unchanged.
 */
public class PickCopyChromeClient extends BridgeWebChromeClient {
    static final String DIR = "picks";
    // the web side refuses anything over 25 MB; don't fill the cache with a 2 GB video copy
    private static final long MAX_COPY = 64L * 1024 * 1024;
    private final Context ctx;
    private final String authority;

    public PickCopyChromeClient(Bridge bridge) {
        super(bridge);
        ctx = bridge.getContext().getApplicationContext();
        authority = ctx.getPackageName() + ".fileprovider";
    }

    /** Old copies hold health data (lab report PDFs and photos): drop them. */
    static void clear(Context c) {
        File[] fs = new File(c.getCacheDir(), DIR).listFiles();
        if (fs != null) for (File f : fs) f.delete();
    }

    @Override
    public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
        clear(ctx);
        Handler main = new Handler(Looper.getMainLooper());
        return super.onShowFileChooser(view, uris -> {
            if (uris == null || uris.length == 0) { cb.onReceiveValue(uris); return; }
            new Thread(() -> {
                Uri[] out = new Uri[uris.length];
                for (int i = 0; i < uris.length; i++) out[i] = copy(uris[i], i);
                main.post(() -> cb.onReceiveValue(out));
            }).start();
        }, params);
    }

    // returns the original uri if it is already ours or the copy fails: never worse than before
    private Uri copy(Uri src, int i) {
        if (src == null || authority.equals(src.getAuthority())) return src;
        File dir = new File(ctx.getCacheDir(), DIR);
        dir.mkdirs();
        File dst = new File(dir, i + "-" + safeName(src));
        try (InputStream in = ctx.getContentResolver().openInputStream(src); OutputStream os = new FileOutputStream(dst)) {
            if (in == null) return src;
            byte[] buf = new byte[64 * 1024];
            long total = 0;
            for (int n; (n = in.read(buf)) > 0; ) {
                total += n;
                if (total > MAX_COPY) throw new java.io.IOException("too large");
                os.write(buf, 0, n);
            }
        } catch (Exception e) {
            dst.delete();
            return src;
        }
        return FileProvider.getUriForFile(ctx, authority, dst);
    }

    // the display name keeps its extension, which is what gives the WebView the file's type
    private String safeName(Uri u) {
        String name = null;
        try (Cursor c = ctx.getContentResolver().query(u, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)) {
            if (c != null && c.moveToFirst()) name = c.getString(0);
        } catch (Exception ignored) { }
        if (name == null || name.isEmpty()) name = "file";
        name = name.replaceAll("[^A-Za-z0-9._-]", "_");
        return name.length() > 80 ? name.substring(name.length() - 80) : name;
    }
}
