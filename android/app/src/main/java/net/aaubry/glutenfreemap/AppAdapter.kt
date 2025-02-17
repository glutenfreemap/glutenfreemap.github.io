package net.aaubry.glutenfreemap

import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class AppAdapter(
    private val activities: List<ResolveInfo>,
    private val packageManager: PackageManager,
    private val onAppSelected: (ResolveInfo) -> Unit
) : RecyclerView.Adapter<AppAdapter.AppViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): AppViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.list_item_app, parent, false)
        return AppViewHolder(view)
    }

    override fun onBindViewHolder(holder: AppViewHolder, position: Int) {
        val resolveInfo = activities[position]
        holder.bind(resolveInfo)
    }

    override fun getItemCount(): Int = activities.size

    inner class AppViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val icon: ImageView = itemView.findViewById(R.id.icon)
        private val appName: TextView = itemView.findViewById(R.id.appName)

        fun bind(resolveInfo: ResolveInfo) {
            appName.text = resolveInfo.loadLabel(packageManager)
            icon.setImageDrawable(resolveInfo.loadIcon(packageManager))

            itemView.setOnClickListener {
                onAppSelected(resolveInfo)
            }
        }
    }
}
