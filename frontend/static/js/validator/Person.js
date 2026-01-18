
const viewPersonValidator = (ele, scope = "local") => {

    const validators = {
        "person.birthdate": () => {
            
            if (baseValidators.name(ele.value)) {

                update_simple_valid([ele.id])

            } else {

                update_simple_invalid([ele.id])
            }

        },
        "person.contact.phone": () => {
            const pattern = /^(\d{2})(\d{8}|\d{9})$/
            if (pattern.test(ele.value)) {

                update_simple_valid([ele.id])

            } else {

                update_simple_invalid([ele.id])
            }

        },        
        "person.contact.email": () => {
            
            if (ele.validity.valid) {

                update_simple_valid([ele.id])

            } else {

                update_simple_invalid([ele.id])
            }

        },
        "person.job.name": () => {
            
            if (ele.validity.valid) {

                update_simple_valid([ele.id])

            } else {

                update_simple_invalid([ele.id])
            }

        },

        "person.address.property.address.city.name": () => {
            
            if (baseValidators.name(ele.value)) {

                update_simple_valid([ele.id])

                showListCityPill(ele.value)

            } else {

                update_simple_invalid([ele.id])
            }

        },
        "person.address.property.address.neighborhood.name": async () => {
            
            if (baseValidators.name(ele.value)) {

                update_simple_valid([ele.id])

                const partial = await formCopy();

                document.getElementById("person.address.property.address.neighborhood._key").value = ""

                showListNeighborhoodPill(ele.value,partial.person.address.property.address.city._key)

            } else {

                update_simple_invalid([ele.id])
            }

        },
        "person.esf.name": async () => {
            
            if (baseValidators.name(ele.value)) {

                update_simple_valid([ele.id])

                const partial = await formCopy();

                document.getElementById("person.esf._key").value = ""

                showListEsfPill(ele.value,partial.person.esf._key)

            } else {

                update_simple_invalid([ele.id])
            }

        },
        "person.acs.name": async () => {
            
            if (baseValidators.name(ele.value)) {

                update_simple_valid([ele.id])

                const partial = await formCopy();

                document.getElementById("person.acs._key").value = ""

                showListAcsPill(ele.value,partial.person.acs._key)

            } else {

                update_simple_invalid([ele.id])
            }

        },
        "person.address.property.address.way.name": async () => {
            
            if (baseValidators.name(ele.value)) {

                update_simple_valid([ele.id])

                const partial = await formCopy();

                document.getElementById("person.address.property.address.way._key").value = ""

                showListWayPill(ele.value,partial.person.address.property.address.city._key)
                

            } else {

                update_simple_invalid([ele.id])
            }

        },
        "person.name": async () => {

            if (baseValidators.name(ele.value)) {

                update_simple_valid([ele.id])

                const partial = await formCopy()

                if(partial.person._key == "" && partial.person.id == "") {
                    
                    showListMotherNamePill(ele.value)

                }
            } else {

                update_simple_invalid([ele.id])
            }

        },
      "person.id": () => {
            if (ele.value.length >= 2) { 
                showListPersonNamePill(ele.value)
           
                searchPersonById(ele.value)
            }

            if (baseValidators.cpf(ele.value)) {
                update_simple_valid([ele.id])
           
            } else {
                update_simple_invalid([ele.id])
            }
        },
        "person.susCard": () => {

            if (baseValidators.susCard(ele.value)) {

                update_simple_valid([ele.id])

                searchPersonBySusCard(ele)

            } else {
                update_simple_invalid([ele.id])
            }
        },
        "person.gender": () => {

            if (ele.value != "") {

                update_simple_valid([ele.id])

            } else {
                update_simple_invalid([ele.id])
            }
        }

    }
    validators[ele.id]()
}

const baseValidators = {

    "susCard": (val) => {

        if (val.length !== 15 || !/^\d{15}$/.test(val)) {
            return false;
        }

        let soma = 0;
        let peso = 15;

        for (let i = 0; i < 15; i++) {
            soma += parseInt(val.charAt(i)) * peso;
            peso--;
        }

        let resto = soma % 11;

        return resto === 0;
    },
    "cpf": (val) => {

        let cpf = val.trim();

        if (cpf.length < 11) {
            return false;
        }

        cpf = cpf.split('');

        var v1 = 0;
        var v2 = 0;
        var aux = false;

        for (var i = 1; cpf.length > i; i++) {
            if (cpf[i - 1] != cpf[i]) {
                aux = true;
            }
        }

        if (aux == false) {
            return false;
        }

        for (var i = 0, p = 10; (cpf.length - 2) > i; i++, p--) {
            v1 += cpf[i] * p;
        }

        v1 = ((v1 * 10) % 11);

        if (v1 == 10) {
            v1 = 0;
        }

        if (v1 != cpf[9]) {
            return false;
        }

        for (var i = 0, p = 11; (cpf.length - 1) > i; i++, p--) {
            v2 += cpf[i] * p;
        }

        v2 = ((v2 * 10) % 11);

        if (v2 == 10) {
            v2 = 0;
        }

        if (v2 != cpf[10]) {
            return false;
        } else {
            return true;
        }
    },
    "cnpj": (val) => {

        var cnpj = val.trim();

        if (cnpj.length < 14) {
            return
        }

        cnpj = cnpj.split('');

        var v1 = 0;
        var v2 = 0;
        var aux = false;

        for (var i = 1; cnpj.length > i; i++) {
            if (cnpj[i - 1] != cnpj[i]) {
                aux = true;
            }
        }

        if (aux == false) {
            return false;
        }

        for (var i = 0, p1 = 5, p2 = 13; (cnpj.length - 2) > i; i++, p1--, p2--) {
            if (p1 >= 2) {
                v1 += cnpj[i] * p1;
            } else {
                v1 += cnpj[i] * p2;
            }
        }

        v1 = (v1 % 11);

        if (v1 < 2) {
            v1 = 0;
        } else {
            v1 = (11 - v1);
        }

        if (v1 != cnpj[12]) {
            return false;
        }

        for (var i = 0, p1 = 6, p2 = 14; (cnpj.length - 1) > i; i++, p1--, p2--) {
            if (p1 >= 2) {
                v2 += cnpj[i] * p1;
            } else {
                v2 += cnpj[i] * p2;
            }
        }

        v2 = (v2 % 11);

        if (v2 < 2) {
            v2 = 0;
        } else {
            v2 = (11 - v2);
        }

        if (v2 != cnpj[13]) {
            return false;
        } else {
            return true;
        }

    },
    "name": (val) =>{

        let name = val.trim()
            
        if (name.length == 0) {
            return false;
        }

        return true;
    }    

}