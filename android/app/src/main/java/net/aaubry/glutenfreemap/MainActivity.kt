package net.aaubry.glutenfreemap

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.Menu
import android.webkit.*
import android.widget.ArrayAdapter
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.ActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContentProviderCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONArray
import org.json.JSONObject

class MainActivity : AppCompatActivity() {
    companion object {
        const val preferencesKey: String = "preferences"
        const val languagePreferenceKey: String = "language"
        const val MY_PERMISSIONS_REQUEST_LOCATION: Int = 99
    }

    private var menu: Menu? = null
    private var menuDefinition: JSONArray? = null
    private var geoLocationRequestOrigin: String? = null
    private var geoLocationCallback: GeolocationPermissions.Callback? = null

    override fun onCreateOptionsMenu(menu: Menu?): Boolean {
        this.menu = menu
        tryBuildMainMenu()
        return true
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        WebView.setWebContentsDebuggingEnabled(true)

        val browser: WebView = findViewById(R.id.browser)

        browser.settings.javaScriptEnabled = true
        browser.settings.domStorageEnabled = true
        browser.settings.setGeolocationEnabled(true)
        browser.webViewClient = MyWebViewClient(this)
        browser.webChromeClient = MyWebChromeClient(this)

        browser.addJavascriptInterface(this, "Android")

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (browser.canGoBack()) {
                    browser.goBack()
                }
            }
        })

        val preferences = getSharedPreferences(preferencesKey, Context.MODE_PRIVATE)
        val language = preferences.getString(languagePreferenceKey, null)
        if (language != null) {
            browser.loadUrl("${BuildConfig.BASE_URL}/${language}/")
        } else {
            browser.loadUrl(BuildConfig.BASE_URL)
        }
    }

    @JavascriptInterface
    fun setLanguage(language: String) {
        runOnUiThread {
            val preferences = getSharedPreferences(preferencesKey, Context.MODE_PRIVATE)
            with (preferences.edit()) {
                putString(languagePreferenceKey, language)
                apply()
            }
        }
    }

    @JavascriptInterface
    fun setMenu(menuJson: String) {
        menuDefinition = JSONArray(menuJson)
        runOnUiThread {
            tryBuildMainMenu()
        }
    }

    @JavascriptInterface
    fun getAppVersion(): Int {
        return BuildConfig.VERSION_CODE
    }

    @JavascriptInterface
    fun getAndroidVersion(): Int {
        return Build.VERSION.SDK_INT
    }

    private fun tryBuildMainMenu() {
        if (menu != null && menuDefinition != null) {
            menu!!.clear()
            buildMenu(menuDefinition!!, menu!!)
            menuDefinition = null
        }
    }

    private fun buildMenu(menuDefinition: JSONArray, menu: Menu) {
        for (i in 1..menuDefinition.length()) {
            val itemDefinition = menuDefinition[i - 1] as JSONObject

            val label = itemDefinition.getString("label")
            val children = itemDefinition.optJSONArray("children")
            if (children != null) {
                val item = menu.addSubMenu(label)
                buildMenu(children, item)
            } else {
                val item = menu.add(label)
                val url = itemDefinition.getString("url")
                item.setOnMenuItemClickListener {
                    val browser: WebView = findViewById(R.id.browser)
                    browser.loadUrl(url)
                    true
                }
            }
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        when (requestCode) {
            MY_PERMISSIONS_REQUEST_LOCATION -> {
                // If request is cancelled, the result arrays are empty.
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {

                    // permission was granted, yay!
                    geoLocationCallback?.invoke(geoLocationRequestOrigin, true, false)
                } else {
                    // permission denied, boo! Disable the
                    // functionality that depends on this permission.
                    geoLocationCallback?.invoke(geoLocationRequestOrigin, false, false)
                }
            }
            else -> super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        }
    }

    private class MyWebChromeClient(private val owner: MainActivity) : WebChromeClient() {
        override fun onGeolocationPermissionsShowPrompt(
            origin: String?,
            callback: GeolocationPermissions.Callback?
        ) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                // Marshmallow+ Permission APIs
                askRuntimePermission(origin, callback)
            } else {
                callback?.invoke(origin, true, false)
            }
        }

        @RequiresApi(Build.VERSION_CODES.M)
        private fun askRuntimePermission(
            origin: String?,
            callback: GeolocationPermissions.Callback?
        ) {
            owner.geoLocationRequestOrigin = null
            owner.geoLocationCallback = null
            // Do We need to ask for permission?
            if (owner.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {

                // Should we show an explanation?
                if (owner.shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_FINE_LOCATION)) {

                    AlertDialog.Builder(owner)
                        .setMessage(R.string.permission_location_rationale)
                        .setNeutralButton(android.R.string.ok) { _, _ ->
                            owner.geoLocationRequestOrigin = origin
                            owner.geoLocationCallback = callback
                            owner.requestPermissions(
                                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
                                MY_PERMISSIONS_REQUEST_LOCATION
                            )
                        }
                        .show()

                } else {
                    // No explanation needed, we can request the permission.

                    owner.geoLocationRequestOrigin = origin
                    owner.geoLocationCallback = callback
                    owner.requestPermissions(
                        arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
                        MY_PERMISSIONS_REQUEST_LOCATION
                    )
                }
            } else {
                // Tell the WebView that permission has been granted
                callback?.invoke(origin, true, false)
            }
        }
    }

    private class MyWebViewClient(private val owner: MainActivity) : WebViewClient() {
        private var allowedDomain: String = Uri.parse(BuildConfig.BASE_URL).authority!!

        override fun onPageFinished(view: WebView?, url: String?) {
            super.onPageFinished(view, url)

            view!!.evaluateJavascript("document.body.className = 'android'", null)
        }

        override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
            val uri = Uri.parse(url)
            if (allowedDomain == uri.authority) {
                // This is my web site, so do not override; let my WebView load the page
                return false
            }

            // Otherwise, the link is not for a page on my site, so launch another Activity that handles URLs
            if (uri.scheme == "geo") {
                owner.openGeoUri(uri);
            } else {
                Intent(Intent.ACTION_VIEW, uri).apply {
                    owner.startActivity(this)
                }
            }
            return true
        }

        override fun onReceivedError(
            view: WebView?,
            request: WebResourceRequest?,
            error: WebResourceError?
        ) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Log.e("WebView error", "${error?.errorCode}: ${error?.description}")
            } else {
                Log.e("WebView error", error?.toString()!!)
            }
        }

        override fun onReceivedHttpError(
            view: WebView?,
            request: WebResourceRequest?,
            errorResponse: WebResourceResponse?
        ) {
            Log.e("HTTP error", "${request?.url}: ${errorResponse?.statusCode} ${errorResponse?.reasonPhrase}")
        }
    }

    fun openGeoUri(uri: Uri) {
        val keyValues = uri.query!!.split("&").associate {
            val (key, value) = it.split("=")
            key to value
        }

        // Get the list of activities that can handle the intent
        val activities = this.packageManager.queryIntentActivities(Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0")), 0)

        if (activities.size > 1) {
            showChooserDialog(activities) { packageName ->
                launchGeoUriIntent(keyValues, packageName)
            }
        } else if (activities.size == 1) {
            launchGeoUriIntent(keyValues, activities.first().resolvePackageName)
        } else {
            launchGeoUriIntent(keyValues, null)
        }
    }

    private fun launchGeoUriIntent(keyValues: Map<String, String>, packageName: String?) {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            if (packageName == "com.google.android.apps.maps" || packageName == null) {
                // Modify intent for Google Maps
                val url = if (keyValues.containsKey("gid"))
                    "https://www.google.com/maps/search/?api=1&query=${keyValues["addr"]}&query_place_id=${keyValues["gid"]}"
                    else "https://www.google.com/maps/search/?api=1&query=${keyValues["name"]},${keyValues["addr"]}"

                data = Uri.parse(url)
            } else {
                data = Uri.parse("geo:0,0?q=${keyValues["q"]}(${keyValues["name"]})")
            }
            if (packageName != null) {
                setPackage(packageName)
            }
        }

        // Launch the selected application
        startActivity(intent)
    }

    private fun showChooserDialog(activities: List<ResolveInfo>, onAppSelected: (String) -> Unit) {
        val packageManager = packageManager

        val dialogView = layoutInflater.inflate(R.layout.dialog_app_chooser, null)
        val dialog = AlertDialog.Builder(this)
            .setTitle(getString(R.string.choose_application))
            .setView(dialogView)
            .create()

        val recyclerView: RecyclerView = dialogView.findViewById(R.id.recyclerView)
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = AppAdapter(activities, packageManager) { selectedActivity ->
            val packageName = selectedActivity.activityInfo.packageName
            dialog.dismiss()
            onAppSelected(packageName)
        }

        dialog.show()
    }
}