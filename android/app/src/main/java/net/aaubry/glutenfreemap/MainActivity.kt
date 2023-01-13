package net.aaubry.glutenfreemap

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.Menu
import android.webkit.*
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONArray
import org.json.JSONObject


class MainActivity : AppCompatActivity() {
    companion object {
        const val hostName: String = "glutenfreemap.github.io"
        const val preferencesKey: String = "preferences"
        const val languagePreferenceKey: String = "language"
        const val MY_PERMISSIONS_REQUEST_LOCATION: Int = 99
    }

    private var menu: Menu? = null
    private var geoLocationRequestOrigin: String? = null
    private var geoLocationCallback: GeolocationPermissions.Callback? = null

    override fun onCreateOptionsMenu(menu: Menu?): Boolean {
        this.menu = menu
        return true
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        if (0 != applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        val browser: WebView = findViewById(R.id.browser)

        browser.settings.javaScriptEnabled = true
        browser.settings.domStorageEnabled = true
        browser.settings.setGeolocationEnabled(true)
        browser.webViewClient = MyWebViewClient(this)
        browser.webChromeClient = MyWebChromeClient(this)

        browser.addJavascriptInterface(this, "Android")

        val preferences = getSharedPreferences(preferencesKey, Context.MODE_PRIVATE)
        val language = preferences.getString(languagePreferenceKey, null)
        if (language != null) {
            browser.loadUrl("https://${hostName}/${language}")
        } else {
            browser.loadUrl("https://${hostName}")
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
        val menuDefinition = JSONArray(menuJson)
        runOnUiThread {
            menu!!.clear()
            buildMenu(menuDefinition, menu!!)
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
                askRuntimePermission(origin, callback);
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

        override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
            val uri = Uri.parse(url)
            if (uri.authority == hostName) {
                // This is my web site, so do not override; let my WebView load the page
                return false
            }

            // Otherwise, the link is not for a page on my site, so launch another Activity that handles URLs
            Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                owner.startActivity(this)
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
}