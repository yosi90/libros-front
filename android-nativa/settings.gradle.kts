pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Libros"
include(":app")
// La librería de la sesión nativa de la plataforma, copiada sin cambios del kit (yosiftware-sesion/ORIGEN.md).
include(":yosiftware-sesion")
