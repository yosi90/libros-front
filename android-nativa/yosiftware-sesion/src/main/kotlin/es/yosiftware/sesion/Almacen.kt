package es.yosiftware.sesion

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import java.io.File
import java.nio.ByteBuffer
import java.security.GeneralSecurityException
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Dónde se guarda el `refresh` de la sesión. En las pruebas se cambia por uno en memoria. */
internal interface AlmacenRefresh {
    fun leer(): String?
    fun guardar(valor: String)
    fun borrar()
}

/**
 * El `refresh`, cifrado con AES-GCM con una clave del Android Keystore, que no sale de él, en un archivo de
 * `noBackupFilesDir`: no entra en las copias de seguridad del sistema ni en las transferencias a otro móvil. Si la
 * clave ya no lo descifra (datos restaurados de otra forma, clave borrada), se descarta y la persona vuelve a entrar.
 *
 * Desde la 1.4.0, un archivo por [hueco] (una cuenta guardada, o el índice de las cuentas), todos con la misma clave.
 * El hueco vacío es el archivo de la 1.3 (`yosiftware-sesion-<web>.bin`): la sesión guardada sigue donde estaba.
 */
internal class AlmacenKeystore(context: Context, web: String, hueco: String = "") : AlmacenRefresh {
    private val alias = "yosiftware-sesion-$web"
    private val archivo = AtomicFile(
        File(context.noBackupFilesDir, if (hueco.isEmpty()) "yosiftware-sesion-$web.bin" else "yosiftware-sesion-$web-$hueco.bin"),
    )

    override fun leer(): String? {
        val datos = try {
            archivo.readFully()
        } catch (_: java.io.FileNotFoundException) {
            return null
        }
        return try {
            val buffer = ByteBuffer.wrap(datos)
            val iv = ByteArray(buffer.get().toInt()).also { buffer.get(it) }
            val cifrado = ByteArray(buffer.remaining()).also { buffer.get(it) }
            val descifrador = Cipher.getInstance(TRANSFORMACION)
            descifrador.init(Cipher.DECRYPT_MODE, clave(crear = false) ?: return descartar(), GCMParameterSpec(128, iv))
            descifrador.doFinal(cifrado).toString(Charsets.UTF_8)
        } catch (_: GeneralSecurityException) {
            descartar()
        } catch (_: RuntimeException) {
            descartar()
        }
    }

    override fun guardar(valor: String) {
        val cifrador = Cipher.getInstance(TRANSFORMACION)
        cifrador.init(Cipher.ENCRYPT_MODE, clave(crear = true))
        val iv = cifrador.iv
        val cifrado = cifrador.doFinal(valor.toByteArray(Charsets.UTF_8))
        val salida = archivo.startWrite()
        try {
            salida.write(byteArrayOf(iv.size.toByte()))
            salida.write(iv)
            salida.write(cifrado)
            archivo.finishWrite(salida)
        } catch (error: Exception) {
            archivo.failWrite(salida)
            throw error
        }
    }

    override fun borrar() {
        archivo.delete()
    }

    private fun descartar(): String? {
        borrar()
        return null
    }

    private fun clave(crear: Boolean): SecretKey? {
        val almacen = KeyStore.getInstance(KEYSTORE).apply { load(null) }
        (almacen.getKey(alias, null) as SecretKey?)?.let { return it }
        if (!crear) return null
        val generador = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE)
        generador.init(
            KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build(),
        )
        return generador.generateKey()
    }

    private companion object {
        const val KEYSTORE = "AndroidKeyStore"
        const val TRANSFORMACION = "AES/GCM/NoPadding"
    }
}

/** Los huecos de verdad, uno por archivo cifrado. */
internal class HuecosKeystore(private val context: Context, private val web: String) : Huecos {
    private val abiertos = mutableMapOf<String, AlmacenKeystore>()

    @Synchronized
    override fun de(nombre: String): AlmacenRefresh = abiertos.getOrPut(nombre) { AlmacenKeystore(context, web, nombre) }
}
