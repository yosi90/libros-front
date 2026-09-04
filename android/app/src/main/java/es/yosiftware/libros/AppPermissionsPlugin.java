package es.yosiftware.libros;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "AppPermissions",
    permissions = {
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS }),
        @Permission(alias = "camera", strings = { Manifest.permission.CAMERA }),
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }),
        @Permission(alias = "photos", strings = { Manifest.permission.READ_MEDIA_IMAGES }),
        @Permission(alias = "photosSelected", strings = { Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED }),
        @Permission(alias = "photosLegacy", strings = { Manifest.permission.READ_EXTERNAL_STORAGE })
    }
)
public class AppPermissionsPlugin extends Plugin {
    @PluginMethod
    public void status(PluginCall call) {
        resolveStatus(call);
    }

    @PluginMethod
    public void request(PluginCall call) {
        String permission = call.getString("permission", "");
        String alias = alias(permission);
        if (alias == null) {
            call.reject("unknown_permission");
            return;
        }
        requestPermissionForAlias(alias, call, "permissionResult");
    }

    @PermissionCallback
    private void permissionResult(PluginCall call) {
        resolveStatus(call);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    private void resolveStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("notifications", permissionState("notifications"));
        result.put("camera", permissionState("camera"));
        result.put("microphone", permissionState("microphone"));
        result.put("photos", photoPermissionState());
        call.resolve(result);
    }

    private String permissionState(String alias) {
        if (alias.equals("notifications") && Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU)
            return "granted";
        return getPermissionState(alias).toString().toLowerCase();
    }

    private String photoPermissionState() {
        String state = permissionState(photoAlias());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE
            && !state.equals("granted")
            && permissionState("photosSelected").equals("granted"))
            return "limited";
        return state;
    }

    private String alias(String permission) {
        switch (permission) {
            case "notifications": return "notifications";
            case "camera": return "camera";
            case "microphone": return "microphone";
            case "photos": return photoAlias();
            default: return null;
        }
    }

    private String photoAlias() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU ? "photos" : "photosLegacy";
    }
}
