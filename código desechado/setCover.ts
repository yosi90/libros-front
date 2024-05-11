setCover(event: NgxDropzoneChangeEvent) {
    const file = event.addedFiles[0];
    const formData = new FormData();
    const allowedExtensions = ['jpg'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        this.openSnackBar('Error: El archivo debe ser de tipo JPG.', 'errorBar');
        return;
    }
    formData.append('cover', file);
    const token = this.loginSrv.token;
    this.bookSrv.setCover(Number(event.source.id), formData, token).subscribe(
        (response: Book) => {
            this.openSnackBar(`Portada actualizada`, 'successBar');
            const bookToUpdate = this.userData?.books?.find(
                (b) => b.bookId === response.bookId
            );
            if (bookToUpdate) bookToUpdate.cover = response.cover;
            else this.openSnackBar('Error al actualizar la portada', 'errorBar');
        },
        (error) => {
            this.openSnackBar(`Error al actualizar la portada: ${error}`, 'errorBar');
        }
    );
}