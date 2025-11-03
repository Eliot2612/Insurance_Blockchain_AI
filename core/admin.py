from django.contrib import admin
from core.models import Claim, ClaimImage


class ClaimAdmin(admin.ModelAdmin):
    list_display = ('claim_id', 'user', 'disaster_type', 'ml_score', 'status')
    readonly_fields = ('ml_score', 'status', 'claim_id')


class ClaimImageAdmin(admin.ModelAdmin):
    list_display = ('claim', 'image_file')


admin.site.register(Claim, ClaimAdmin)
admin.site.register(ClaimImage, ClaimImageAdmin)
